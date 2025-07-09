import React, { useEffect, useRef, useState } from 'react';
import '@tensorflow/tfjs-backend-webgl';
import * as handpose from '@tensorflow-models/hand-pose-detection';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

const W = 400, H = 300;
const TRAIL_LEN = 45;
const COLORS = ['yellow','orange'];
const MOVE_EPS = 2;
const ANGLE_THR = 1.0;
const CALIBRATION_TIME = 5000;
const RECORD_TIME = 30000;

const TOO_LITTLE = m => m.speed < 100 && m.err < 3;
const TOO_MUCH   = m => m.speed > 300 || m.err > 7;

const MOCK_REPORT = {
  content_score: 7.8,
  voice_score:   3.5,
  face_score:    4.2,
  overall_feedback: 'Great energy! Work on pausing between points.',
  interview_duration: '00:00:30',
  strengths: ['Clear answer structure','Confident posture'],
  areas_for_improvement: ['Slow down speech','Add specific examples'],
  tips: ['Pause two seconds after each key point.','Use hands to emphasise, not fill space.'],
  transcript: 'My greatest strength is resilience.',
};

export default function VideoAudioProcessor({ onFinish }) {
  const videoRef = useRef();
  const canvasRef = useRef();
  const rafRef = useRef();
  const trails = useRef([[], []]);
  const showOverlay = useRef(true);
  const iodRef = useRef(null);
  const baselineIOD = useRef(null);
  const lastEyeLine = useRef(null);
  const [calibrated, setCalibrated] = useState(false);
  const [ui, setUI] = useState({
    hand: [{speed:0, err:0}, {speed:0, err:0}],
    feedback: 'Waiting for hands…',
    finished: false,
    countdown: 5
  });

  useEffect(() => {
    let stream, handDetector, faceDetector;
    let calibrationTimer, recordTimer;
    let frameCount = 0;

    (async () => {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: W, height: H }, audio: true });
      const vid = videoRef.current;
      vid.srcObject = stream;
      await vid.play();
      vid.style.transform = 'scaleX(-1)';
      vid.style.objectFit = 'cover';

      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = W;
      canvasRef.current.height = H;

      handDetector = await handpose.createDetector(handpose.SupportedModels.MediaPipeHands, {
        runtime: 'tfjs',
        modelType: 'lite',
        maxHands: 2
      });

      faceDetector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: 'tfjs',
          refineLandmarks: true,
          maxFaces: 1
        }
      );

      let countdown = 5;
      calibrationTimer = setInterval(() => {
        countdown--;
        setUI(u => ({ ...u, countdown }));
        if (countdown === 0) {
          clearInterval(calibrationTimer);
          setCalibrated(true);

          // Capture baseline IOD at end of calibration
          baselineIOD.current = iodRef.current;

          recordTimer = setTimeout(() => {
            if (rafRef.current) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }
            stream.getTracks().forEach(t => t.stop());
            setUI(u => ({ ...u, finished: true }));
            onFinish?.(MOCK_REPORT);
          }, RECORD_TIME);
        }
      }, 1000);

      const loop = async () => {
        if (!canvasRef.current || !videoRef.current) return;
        const vid = videoRef.current;
        const ctx = canvasRef.current.getContext('2d');
        if (vid.readyState < 2) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        frameCount++;
        const [hands, faces] = await Promise.all([
          handDetector.estimateHands(vid),
          frameCount % 3 === 0 ? faceDetector.estimateFaces(vid) : []
        ]);

        ctx.clearRect(0, 0, W, H);

        if (!calibrated && showOverlay.current) {
          ctx.save();
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(W / 2, H / 3, 45, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        if (faces.length > 0) {
          const k = faces[0].keypoints;
          const l = k.find(p => p.name === 'leftEye');
          const r = k.find(p => p.name === 'rightEye');
          if (l && r) {
            iodRef.current = Math.hypot(l.x - r.x, l.y - r.y);
            lastEyeLine.current = { lx: l.x, ly: l.y, rx: r.x, ry: r.y };
          }
        }

        if (lastEyeLine.current && showOverlay.current) {
          const { lx, ly, rx, ry } = lastEyeLine.current;
          ctx.save();
          ctx.translate(W, 0);
          ctx.scale(-1, 1);
          ctx.beginPath();
          ctx.strokeStyle = 'cyan';
          ctx.lineWidth = 2;
          ctx.moveTo(lx, ly);
          ctx.lineTo(rx, ry);
          ctx.stroke();
          ctx.restore();
        }

        const iodScale = iodRef.current && baselineIOD.current
          ? iodRef.current / baselineIOD.current
          : 1.0;

        const seen = [false, false];
        const metrics = [{ speed: 0, err: 0 }, { speed: 0, err: 0 }];

        for (let idx = 0; idx < 2; idx++) {
          const h = hands[idx];
          if (!h) {
            trails.current[idx] = [];
            continue;
          }
          seen[idx] = true;

          const k = h.keypoints;
          const x = (k[8].x + k[9].x + k[12].x) / 3;
          const y = (k[8].y + k[9].y + k[12].y) / 3;
          const tr = trails.current[idx];
          tr.push({ x, y });
          if (tr.length > TRAIL_LEN) tr.shift();

          if (showOverlay.current) {
            ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
            h.keypoints.forEach(pt => {
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 4, 0, 2 * Math.PI);
              ctx.fillStyle = 'lime';
              ctx.fill();
            });
            ctx.restore();

            ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
            ctx.strokeStyle = COLORS[idx];
            ctx.lineWidth = 2;
            ctx.beginPath();
            tr.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
            ctx.stroke();
            ctx.restore();
          }

          const segs = tr.slice(1).map((p, i) => {
            const dx = p.x - tr[i].x, dy = p.y - tr[i].y;
            return { d: Math.hypot(dx, dy), a: Math.atan2(dy, dx) };
          }).filter(s => s.d >= MOVE_EPS);

          const total = segs.reduce((s, o) => s + o.d, 0) / iodScale;
          const speed = total / (tr.length / 30);
          let turns = 0;
          segs.forEach((s, i) => {
            if (i > 0) {
              let dA = Math.abs(s.a - segs[i - 1].a);
              if (dA > Math.PI) dA = 2 * Math.PI - dA;
              if (dA > ANGLE_THR) turns++;
            }
          });
          const err = turns / (tr.length / 30);
          metrics[idx] = { speed, err };
        }

        let fb = seen[0]
          ? TOO_LITTLE(metrics[0]) ? 'Too little – gesture more'
            : TOO_MUCH(metrics[0]) ? 'Too much – slow down'
            : 'Just right'
          : 'No hands detected';

        setUI(u => ({ ...u, hand: metrics, feedback: fb }));
        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    })();

    return () => {
      rafRef.current && cancelAnimationFrame(rafRef.current);
      stream && stream.getTracks().forEach(t => t.stop());
      clearInterval(calibrationTimer);
      clearTimeout(recordTimer);
    };
  }, [onFinish]);

  const toggle = () => {
    showOverlay.current = !showOverlay.current;
  };

  if (ui.finished) return null;

  return (
    <div>
      <div style={{ position: 'relative', width: W, height: H }}>
        <video ref={videoRef}
               width={W} height={H}
               muted playsInline
               style={{ borderRadius: 8, transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef}
                style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
      </div>
      <button onClick={toggle} style={{ margin: '8px 0' }}>
        {showOverlay.current ? 'Hide Overlay' : 'Show Overlay'}
      </button>
      {!calibrated && (
        <div>
          <strong>Calibrating... Align your face inside the circle</strong><br />
          Starting in: {ui.countdown}s
        </div>
      )}
      <div style={{ fontSize: 14 }}>
        {ui.hand.map((h, i) => (
          <div key={i}>
            <strong>Hand {i}:</strong> Avg {h.speed.toFixed(1)} px/s, Erratic {h.err.toFixed(1)} /s
          </div>
        ))}
        <div><strong>Movement:</strong> {ui.feedback}</div>
      </div>
    </div>
  );
}
