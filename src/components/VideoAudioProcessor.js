// src/components/VideoAudioProcessor.js
import React, { useEffect, useRef, useState } from 'react';
import '@tensorflow/tfjs-backend-webgl';
import * as handpose from '@tensorflow-models/hand-pose-detection';

const W = 400, H = 300;
const TRAIL_LEN = 90;                  // ≈3 s @ 30 fps
const COLORS    = ['yellow', 'orange'];
const MOVE_EPS  = 2;
const ANGLE_THR = 1.0;                 // > 57°

/* feedback thresholds */
const TOO_LITTLE = m =>
  m.speed < 100 ||
  (m.total < 300 && m.speed < 150 && m.err < 3);

const TOO_MUCH = m =>
  m.total > 500 || m.speed > 300 || m.err > 7;

export default function VideoAudioProcessor() {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const raf       = useRef(null);
  const trails    = useRef([[], []]);

  const [ui, setUI] = useState({
    hand: [
      { total: 0, speed: 0, err: 0 },
      { total: 0, speed: 0, err: 0 }
    ],
    feedback: 'Waiting for hands…'
  });

  useEffect(() => {
    let stream, detector;

    (async () => {
      /* 1 — webcam */
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: W, height: H }, audio: true
      });
      const vid = videoRef.current;
      vid.srcObject = stream;
      await vid.play();
      vid.style.transform = 'scaleX(-1)';

      /* 2 — canvas */
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = W;
      canvasRef.current.height = H;

      /* 3 — MediaPipe Hands */
      detector = await handpose.createDetector(
        handpose.SupportedModels.MediaPipeHands,
        { runtime: 'tfjs', modelType: 'lite', maxHands: 2 }
      );

      /* 4 — frame loop */
      const loop = async () => {
        const hands = await detector.estimateHands(vid);
        ctx.clearRect(0, 0, W, H);

        const seen = [false, false];
        while (hands.length < 2) hands.push(undefined);

        /* draw landmarks (mirrored) */
        ctx.save();
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
        hands.forEach((h, idx) => {
          if (!h) return;
          seen[idx] = true;
          h.keypoints.forEach(({ x, y }) => {
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = 'lime';
            ctx.fill();
          });
        });
        ctx.restore();

        /* head-slot guide */
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(W / 2, H / 3, 60, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        /* per-hand metrics & trails */
        const metrics = [
          { total: 0, speed: 0, err: 0 },
          { total: 0, speed: 0, err: 0 }
        ];

        [0, 1].forEach(idx => {
          if (!seen[idx]) { trails.current[idx] = []; return; }

          const tip = hands[idx].keypoints[8];
          const trl = trails.current[idx];
          trl.push({ x: tip.x, y: tip.y });
          if (trl.length > TRAIL_LEN) trl.shift();

          /* trail (mirrored) */
          ctx.save();
          ctx.translate(W, 0);
          ctx.scale(-1, 1);
          ctx.strokeStyle = COLORS[idx];
          ctx.lineWidth = 2;
          ctx.beginPath();
          trl.forEach((p, i) =>
            i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)
          );
          ctx.stroke();
          ctx.restore();

          /* metrics */
          const segs = trl.slice(1).map((p, i) => {
            const dx = p.x - trl[i].x, dy = p.y - trl[i].y;
            return { dist: Math.hypot(dx, dy), angle: Math.atan2(dy, dx) };
          }).filter(s => s.dist >= MOVE_EPS);

          const total = segs.reduce((s, d) => s + d.dist, 0);
          const speed = total / (trl.length / 30);

          let turns = 0;
          segs.forEach((s, i) => {
            if (i > 0) {
              let dA = Math.abs(s.angle - segs[i - 1].angle);
              if (dA > Math.PI) dA = 2 * Math.PI - dA;
              if (dA > ANGLE_THR) turns++;
            }
          });
          const err = turns / (trl.length / 30);

          metrics[idx] = { total, speed, err };
        });

        /* ---------- live feedback (uses Hand 0) ---------- */
        let fb = 'No hands detected';
        const m0 = metrics[0];
        if (seen[0]) {
          if (TOO_LITTLE(m0)) fb = 'Too little – gesture more';
          else if (TOO_MUCH(m0)) fb = 'Too much – slow down';
          else fb = 'Just right';
        }

        setUI({ hand: metrics, feedback: fb });
        raf.current = requestAnimationFrame(loop);
      };
      loop();
    })();

    return () => {
      raf.current && cancelAnimationFrame(raf.current);
      stream && stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  /* ---- UI ---- */
  return (
    <div>
      <div style={{ position: 'relative', width: W, height: H }}>
        <video ref={videoRef} width={W} height={H} muted playsInline
               style={{ borderRadius: 8, transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef}
                style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
      </div>

      <div style={{ marginTop: 8, fontSize: 14 }}>
        {ui.hand.map((h, i) => (
          <div key={i}>
            <strong>Hand {i}:</strong>{' '}
            {`Total ${h.total.toFixed(1)} px, ` +
             `Avg ${h.speed.toFixed(1)} px/s, ` +
             `Erratic ${h.err.toFixed(1)} rev/s`}
          </div>
        ))}
        <div style={{ marginTop: 4 }}>
          <strong>Movement:</strong> {ui.feedback}
        </div>
      </div>
    </div>
  );
}
