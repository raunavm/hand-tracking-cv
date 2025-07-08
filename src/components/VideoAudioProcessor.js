import React, { useEffect, useRef } from 'react';
import '@tensorflow/tfjs-backend-webgl';
import * as handpose from '@tensorflow-models/hand-pose-detection';

const W = 400;
const H = 300;
const TRAIL_LEN = 90;               // keep last 3 s @ ~30 fps

export default function VideoAudioProcessor({ onFinish }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const trailRef  = useRef([]);     // [{x,y}, …] index-finger points

  useEffect(() => {
    let stream, detector;

    (async () => {
      /* webcam */
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: W, height: H }, audio: true,
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      /* mirror both layers */
      [videoRef.current, canvasRef.current].forEach(el => {
        el.width = W; el.height = H;
        el.style.transform = 'scaleX(-1)';
      });

      /* MediaPipe Hands */
      detector = await handpose.createDetector(
        handpose.SupportedModels.MediaPipeHands,
        { runtime: 'tfjs', modelType: 'lite', maxHands: 2 }
      );

      /* draw loop */
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

        /* fingertip tracking (use first hand if present) */
        if (hands[0]?.keypoints[8]) {
          const { x, y } = hands[0].keypoints[8];       // landmark 8
          trailRef.current.push({ x, y });
          if (trailRef.current.length > TRAIL_LEN) trailRef.current.shift();

          /* draw yellow trail */
          ctx.strokeStyle = 'yellow'; ctx.lineWidth = 2;
          ctx.beginPath();
          trailRef.current.forEach((p, i) =>
            i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)
          );
          ctx.stroke();

          /* simple metric: total distance */
          const dist = trailRef.current.slice(1).reduce(
            (sum, p, i) => sum + Math.hypot(
              p.x - trailRef.current[i].x,
              p.y - trailRef.current[i].y
            ), 0
          );
          console.log('Total distance (px):', dist.toFixed(0));
        }

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

/* mock report (unchanged) */
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
