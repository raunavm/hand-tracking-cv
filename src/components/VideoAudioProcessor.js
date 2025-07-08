import React, { useEffect, useRef } from 'react';
import '@tensorflow/tfjs-backend-webgl';
import * as handpose from '@tensorflow-models/hand-pose-detection';

const W = 400;
const H = 300;

export default function VideoAudioProcessor({ onFinish }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  useEffect(() => {
    let stream, detector;

    (async () => {
      /* 1 — get 400 × 300 webcam stream */
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: W, height: H },
        audio: true,
      });
      const vid = videoRef.current;
      vid.srcObject = stream;
      await vid.play();

      /* 2 — lock size & mirror */
      const can = canvasRef.current;
      [vid, can].forEach(el => {
        el.width  = W;   el.height = H;
        el.style.width  = `${W}px`;
        el.style.height = `${H}px`;
        el.style.transform = 'scaleX(-1)';
      });

      /* 3 — load MediaPipe Hands */
      detector = await handpose.createDetector(
        handpose.SupportedModels.MediaPipeHands,
        { runtime: 'tfjs', modelType: 'lite', maxHands: 2 }
      );

      /* 4 — draw loop */
      const ctx = can.getContext('2d');
      const loop = async () => {
        const hands = await detector.estimateHands(vid);
        ctx.clearRect(0, 0, W, H);
        hands.forEach(h =>
          h.keypoints.forEach(({ x, y }) => {
            ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = 'lime'; ctx.fill();
          })
        );
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();

      /* 5 — finish after 5 s */
      setTimeout(() => {
        cleanup();
        onFinish(MOCK_REPORT);
      }, 5000);
    })();

    /* clean-up on unmount */
    const cleanup = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream && stream.getTracks().forEach(t => t.stop());
    };
    return cleanup;
  }, [onFinish]);

  return (
    <div style={{ position: 'relative', width: W, height: H }}>
      <video ref={videoRef} muted playsInline style={{ borderRadius: 8 }} />
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}

const MOCK_REPORT = {
  content_score: 7.8,
  voice_score:   3.5,
  face_score:    4.2,
  overall_feedback: 'Great energy! Work on pausing between points.',
  interview_duration: '00:00:05',
  strengths: ['Clear answer structure', 'Confident posture'],
  areas_for_improvement: ['Slow down speech', 'Add specific examples'],
  tips: [
    'Pause two seconds after each key point.',
    'Use hands to emphasise, not fill space.',
  ],
  transcript: 'My greatest strength is resilience.',
};
