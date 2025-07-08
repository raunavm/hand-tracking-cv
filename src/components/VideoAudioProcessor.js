import React, { useEffect, useRef } from 'react';
import '@tensorflow/tfjs-backend-webgl';
import * as handpose from '@tensorflow-models/hand-pose-detection';

const W = 400;
const H = 300;
const TRAIL_LEN = 90;                       // ≈3 s @30 fps
const COLORS = ['yellow', 'orange'];        // hand 0, hand 1

export default function VideoAudioProcessor({ onFinish }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const trailsRef = useRef([[], []]);       // one trail per hand

  useEffect(() => {
    let stream, detector;

    (async () => {
      /* webcam */
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: W, height: H }, audio: true,
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      [videoRef.current, canvasRef.current].forEach(el => {
        el.width = W; el.height = H; el.style.transform = 'scaleX(-1)';
      });

      /* MediaPipe Hands */
      detector = await handpose.createDetector(
        handpose.SupportedModels.MediaPipeHands,
        { runtime: 'tfjs', modelType: 'lite', maxHands: 2 }
      );

      /* loop */
      const ctx = canvasRef.current.getContext('2d');
      const loop = async () => {
        const hands = await detector.estimateHands(videoRef.current);
        ctx.clearRect(0, 0, W, H);

        /* draw landmarks */
        hands.forEach(h =>
          h.keypoints.forEach(({ x, y }) => {
            ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = 'lime'; ctx.fill();
          })
        );

        /* per-hand tracking */
        hands.forEach((hand, idx) => {
          const tip = hand.keypoints[8];            // index finger tip
          if (!tip) return;
          const trail = trailsRef.current[idx];
          trail.push({ x: tip.x, y: tip.y });
          if (trail.length > TRAIL_LEN) trail.shift();

          /* draw trail */
          ctx.strokeStyle = COLORS[idx];
          ctx.lineWidth   = 2;
          ctx.beginPath();
          trail.forEach((p, i) =>
            i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)
          );
          ctx.stroke();

          /* distance metric */
          const dist = trail.slice(1).reduce(
            (s, p, i) => s + Math.hypot(
              p.x - trail[i].x,
              p.y - trail[i].y
            ), 0
          );
          console.log(`Hand ${idx} distance:`, dist.toFixed(0), 'px');
        });

        rafRef.current = requestAnimationFrame(loop);
      };
      loop();

      /* finish after 5 s */
      setTimeout(() => {
        cleanup();
        onFinish(MOCK_REPORT);
      }, 5000);
    })();

    const cleanup = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream && stream.getTracks().forEach(t => t.stop());
    };
    return cleanup;
  }, [onFinish]);

  return (
    <div style={{ position: 'relative', width: W, height: H }}>
      <video ref={videoRef} muted playsInline style={{ borderRadius: 8 }} />
      <canvas ref={canvasRef}
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
    </div>
  );
}

/* unchanged mock report */
const MOCK_REPORT = {
  content_score: 7.8,
  voice_score:   3.5,
  face_score:    4.2,
  overall_feedback: 'Great energy! Work on pausing between points.',
  interview_duration: '00:00:05',
  strengths: ['Clear answer structure', 'Confident posture'],
  areas_for_improvement: ['Slow down speech', 'Add specific examples'],
  tips: ['Pause two seconds after each key point.', 'Use hands to emphasise, not fill space.'],
  transcript: 'My greatest strength is resilience.',
};
