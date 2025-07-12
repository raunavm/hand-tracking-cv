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
const HEAD_CIRCLE_RADIUS = 55;
const IOD_RATIO_THRESHOLD = 0.6;
const HEAD_CIRCLE_CENTER_X = W / 2;
const HEAD_CIRCLE_CENTER_Y = H / 3;

// Live feedback thresholds
const TOO_LITTLE = m => m.speed < 130;
const TOO_MUCH   = m => m.speed > 150;

export default function VideoAudioProcessor({ onFinish }) {
  const videoRef = useRef();
  const canvasRef = useRef();
  const rafRef = useRef();
  const trails = useRef([[], []]);
  const showOverlay = useRef(true);
  const iodRef = useRef(null);
  const baselineIOD = useRef(null);
  const faceGoodRef = useRef(false);
  const lastEyeLine = useRef(null);
  const [calibrated, setCalibrated] = useState(false);
  const [ui, setUI] = useState({
    hand: [{speed:0, err:0}, {speed:0, err:0}],
    feedback: '',
    finished: false,
    countdown: 5
  });
  
  // Metrics tracking
  const handVisibleTimeRef = useRef([0, 0]);
  const totalDistanceRef = useRef([0, 0]);
  const erraticCountRef = useRef([0, 0]);
  const lastPositionsRef = useRef([null, null]);
  const lastVectorsRef = useRef([null, null]);
  const lastTimeRef = useRef(0);
  
  // Feedback stability
  const lastFeedbackRef = useRef('');
  const feedbackStableCountRef = useRef(0);
  
  // Track hand positions
  const handAssignments = useRef([null, null]);

  useEffect(() => {
    let stream, handDetector, faceDetector;
    let calibrationTimer, recordTimer;
    let frameCount = 0;

    (async () => {
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: W, height: H }, 
        audio: true 
      });
      const vid = videoRef.current;
      vid.srcObject = stream;
      await vid.play();
      vid.style.transform = 'scaleX(-1)';
      vid.style.objectFit = 'cover';

      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = W;
      canvasRef.current.height = H;

      handDetector = await handpose.createDetector(
        handpose.SupportedModels.MediaPipeHands,
        { runtime: 'tfjs', modelType: 'lite', maxHands: 2 }
      );

      faceDetector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        { runtime: 'tfjs', refineLandmarks: true, maxFaces: 1 }
      );

      let countdown = 5;
      calibrationTimer = setInterval(() => {
        countdown--;
        setUI(u => ({ ...u, countdown }));
        if (countdown === 0) {
          clearInterval(calibrationTimer);
          setCalibrated(true);
          baselineIOD.current = iodRef.current;
          
          // Reset metrics
          handVisibleTimeRef.current = [0, 0];
          totalDistanceRef.current = [0, 0];
          erraticCountRef.current = [0, 0];
          lastPositionsRef.current = [null, null];
          lastVectorsRef.current = [null, null];
          lastTimeRef.current = performance.now();
          
          recordTimer = setTimeout(() => {
            cancelAnimationFrame(rafRef.current);
            stream.getTracks().forEach(t => t.stop());
            setUI(u => ({ ...u, finished: true }));
            
            // Generate movement report
            const movementReport = generateMovementReport();
            onFinish?.(movementReport);
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
        const now = performance.now();
        const delta = lastTimeRef.current ? now - lastTimeRef.current : 0;
        lastTimeRef.current = now;

        const [hands, faces] = await Promise.all([
          handDetector.estimateHands(vid),
          frameCount % 3 === 0 ? faceDetector.estimateFaces(vid) : []
        ]);

        ctx.clearRect(0, 0, W, H);

        let iod = null;
        if (faces.length > 0) {
          const k = faces[0].keypoints;
          const l = k.find(p => p.name === 'leftEye');
          const r = k.find(p => p.name === 'rightEye');
          if (l && r) {
            iod = Math.hypot(l.x - r.x, l.y - r.y);
            iodRef.current = iod;
            lastEyeLine.current = { lx: l.x, ly: l.y, rx: r.x, ry: r.y };

            const centerX = (l.x + r.x) / 2;
            const centerY = (l.y + r.y) / 2;
            const dx = centerX - HEAD_CIRCLE_CENTER_X;
            const dy = centerY - HEAD_CIRCLE_CENTER_Y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const iodLimit = (HEAD_CIRCLE_RADIUS * 2) * IOD_RATIO_THRESHOLD;
            faceGoodRef.current = iod < iodLimit && dist < HEAD_CIRCLE_RADIUS * 0.8;
          }
        }

        if (showOverlay.current) {
          ctx.save();
          ctx.setLineDash([6, 4]);
          ctx.strokeStyle = faceGoodRef.current ? 'green' : 'red';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(HEAD_CIRCLE_CENTER_X, HEAD_CIRCLE_CENTER_Y, HEAD_CIRCLE_RADIUS, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          if (lastEyeLine.current) {
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
        }

        const iodScale = iodRef.current && baselineIOD.current ? iodRef.current / baselineIOD.current : 1.0;
        const seen = [false, false];
        const metrics = [{speed:0, err:0}, {speed:0, err:0}];
        
        // Process each detected hand
        for (const h of hands) {
          // Calculate composite point
          const kpts = h.keypoints;
          const x = (kpts[8].x + kpts[9].x + kpts[12].x) / 3;
          const y = (kpts[8].y + kpts[9].y + kpts[12].y) / 3;
          
          // Determine hand index based on screen position (left/right)
          let handIndex = x < W/2 ? 0 : 1;
          
          // If we've seen this hand before, keep consistent assignment
          if (handAssignments.current[handIndex] === null) {
            handAssignments.current[handIndex] = h;
          } else {
            // Find closest existing hand
            let minDist = Infinity;
            let minIndex = -1;
            for (let i = 0; i < 2; i++) {
              if (handAssignments.current[i] && lastPositionsRef.current[i]) {
                const dist = Math.hypot(
                  x - lastPositionsRef.current[i].x,
                  y - lastPositionsRef.current[i].y
                );
                if (dist < minDist) {
                  minDist = dist;
                  minIndex = i;
                }
              }
            }
            if (minIndex !== -1 && minDist < 50) {
              handIndex = minIndex;
            }
          }
          
          seen[handIndex] = true;
          // Update hand visible time
          handVisibleTimeRef.current[handIndex] += delta;
          
          const tr = trails.current[handIndex]; 
          tr.push({ x, y }); 
          if (tr.length > TRAIL_LEN) tr.shift();
          
          // Calculate distance from last position
          if (lastPositionsRef.current[handIndex]) {
            const dx = x - lastPositionsRef.current[handIndex].x;
            const dy = y - lastPositionsRef.current[handIndex].y;
            const dist = Math.hypot(dx, dy);
            
            if (dist >= MOVE_EPS) {
              const normalizedDist = dist / iodScale;
              totalDistanceRef.current[handIndex] += normalizedDist;
              
              // Track erratic movements
              if (lastVectorsRef.current[handIndex]) {
                const lastDx = lastVectorsRef.current[handIndex].dx;
                const lastDy = lastVectorsRef.current[handIndex].dy;
                const currentAngle = Math.atan2(dy, dx);
                const lastAngle = Math.atan2(lastDy, lastDx);
                let dA = Math.abs(currentAngle - lastAngle);
                if (dA > Math.PI) dA = 2 * Math.PI - dA;
                if (dA > ANGLE_THR) {
                  erraticCountRef.current[handIndex] += 1;
                }
              }
              lastVectorsRef.current[handIndex] = { dx, dy };
            }
          }
          lastPositionsRef.current[handIndex] = { x, y };

          if (showOverlay.current) {
            ctx.save(); 
            ctx.translate(W,0); 
            ctx.scale(-1,1);
            kpts.forEach(pt => { 
              ctx.beginPath(); 
              ctx.arc(pt.x, pt.y, 4, 0, 2*Math.PI); 
              ctx.fillStyle='lime'; 
              ctx.fill(); 
            });
            ctx.restore();
            ctx.save(); 
            ctx.translate(W,0); 
            ctx.scale(-1,1);
            ctx.strokeStyle = COLORS[handIndex]; 
            ctx.lineWidth = 2; 
            ctx.beginPath();
            tr.forEach((p,j) => j ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y)); 
            ctx.stroke(); 
            ctx.restore();
          }
          
          // Calculate current metrics for UI
          const visibleTime = handVisibleTimeRef.current[handIndex] / 1000;
          const currentSpeed = visibleTime > 0 ? 
            totalDistanceRef.current[handIndex] / visibleTime : 0;
          const currentErratic = visibleTime > 0 ? 
            erraticCountRef.current[handIndex] / visibleTime : 0;
          
          metrics[handIndex] = { speed: currentSpeed, err: currentErratic };
        }

        // Calculate feedback using the adjusted thresholds
        let fb = '';
        if (seen[0]) {
          if (TOO_LITTLE(metrics[0])) {
            fb = 'Too little – gesture more';
          } else if (TOO_MUCH(metrics[0])) {
            fb = 'Too much – slow down';
          } else {
            fb = 'Just right';
          }
        } else {
          fb = 'No hands detected';
        }
        
        // Stabilize feedback to prevent flickering
        if (fb === lastFeedbackRef.current) {
          feedbackStableCountRef.current++;
        } else {
          feedbackStableCountRef.current = 0;
          lastFeedbackRef.current = fb;
        }
        
        // Only update UI if feedback has been stable for 5 frames
        if (feedbackStableCountRef.current >= 5) {
          setUI(u => ({ ...u, hand: metrics, feedback: fb }));
        }

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

  // Generate movement report with detailed bullet points
  const generateMovementReport = () => {
    const handMetrics = [];
    let totalScore = 0;
    let handCount = 0;
    
    // Updated bounds based on new thresholds
    const IDEAL_DISTANCE_MIN = 1500;
    const IDEAL_DISTANCE_MAX = 3000;
    const IDEAL_SPEED_MIN = 100;
    const IDEAL_SPEED_MAX = 130;
    const MAX_ERRATIC = 3;
    
    for (let i = 0; i < 2; i++) {
      const visibleTime = handVisibleTimeRef.current[i] / 1000;
      if (visibleTime === 0) continue;
      
      const distance = totalDistanceRef.current[i];
      const speed = distance / visibleTime;
      const erratic = erraticCountRef.current[i] / visibleTime;
      
      // Normalize metrics to 0-3.33 range using new bounds
      // Distance scoring (1500-3000px is ideal)
      let normDistance;
      if (distance < IDEAL_DISTANCE_MIN) {
        normDistance = (distance / IDEAL_DISTANCE_MIN) * 3.33;
      } else if (distance > IDEAL_DISTANCE_MAX) {
        normDistance = Math.max(0, 3.33 - ((distance - IDEAL_DISTANCE_MAX) / IDEAL_DISTANCE_MAX) * 3.33);
      } else {
        normDistance = 3.33;
      }
      
      // Speed scoring (100-130px/s is ideal)
      let normSpeed;
      if (speed < IDEAL_SPEED_MIN) {
        normSpeed = (speed / IDEAL_SPEED_MIN) * 3.33;
      } else if (speed > IDEAL_SPEED_MAX) {
        normSpeed = Math.max(0, 3.33 - ((speed - IDEAL_SPEED_MAX) / IDEAL_SPEED_MAX) * 3.33);
      } else {
        normSpeed = 3.33;
      }
      
      // Erratic scoring (lower is better)
      const normErratic = (1 - Math.min(1, erratic / MAX_ERRATIC)) * 3.33;
      
      // Calculate hand score (capped at 10)
      const handScore = Math.min(10, normDistance + normSpeed + normErratic);
      totalScore += handScore;
      handCount++;
      
      const handLabel = i === 0 ? 'Right Hand' : 'Left Hand';
      
      handMetrics.push({
        hand: handLabel,
        total_distance: distance,
        average_speed: speed,
        erratic_movement: erratic,
        score: handScore
      });
    }
    
    // Calculate overall movement score
    const movementScore = handCount > 0 ? totalScore / handCount : 0;
    
    // Generate multiple bullet points for improvement
    const movementTips = [];
    
    // Score explanation
    let scoreExplanation = '';
    if (movementScore >= 8) {
      scoreExplanation = 'Excellent - Your gestures were natural and effective';
    } else if (movementScore >= 6) {
      scoreExplanation = 'Good - Solid foundation with some room for refinement';
    } else if (movementScore >= 4) {
      scoreExplanation = 'Fair - Needs more consistency in gesture quality';
    } else {
      scoreExplanation = 'Needs Improvement - Focus on gesture control';
    }
    movementTips.push(`Overall Score: ${movementScore.toFixed(1)}/10 - ${scoreExplanation}`);
    
    // Analyze metrics for each hand
    handMetrics.forEach(hand => {
      const handTips = [];
      
      // Distance analysis
      if (hand.total_distance < IDEAL_DISTANCE_MIN) {
        handTips.push(`Total distance too low (${hand.total_distance.toFixed(0)}px) - Use broader gestures`);
      } else if (hand.total_distance > IDEAL_DISTANCE_MAX) {
        handTips.push(`Total distance too high (${hand.total_distance.toFixed(0)}px) - Keep gestures contained`);
      }
      
      // Speed analysis
      if (hand.average_speed < IDEAL_SPEED_MIN) {
        handTips.push(`Speed too low (${hand.average_speed.toFixed(0)}px/s) - Increase movement pace`);
      } else if (hand.average_speed > IDEAL_SPEED_MAX) {
        handTips.push(`Speed too high (${hand.average_speed.toFixed(0)}px/s) - Slow down movements`);
      }
      
      // Erratic movement analysis
      if (hand.erratic_movement > MAX_ERRATIC) {
        handTips.push(`Erratic movements too frequent (${hand.erratic_movement.toFixed(1)}/s) - Focus on smoother motions`);
      } else if (hand.erratic_movement < 1.5) {
        handTips.push(`Erratic movements well-controlled (${hand.erratic_movement.toFixed(1)}/s) - Good job!`);
      }
      
      // Score analysis
      if (hand.score < 4) {
        handTips.push(`Hand score low (${hand.score.toFixed(1)}/10) - Practice controlled gestures`);
      } else if (hand.score < 6) {
        handTips.push(`Hand score needs improvement (${hand.score.toFixed(1)}/10) - Work on consistency`);
      } else if (hand.score >= 8) {
        handTips.push(`Excellent hand score (${hand.score.toFixed(1)}/10) - Maintain effective gestures`);
      }
      
      if (handTips.length > 0) {
        movementTips.push(`${hand.hand} Analysis:`);
        movementTips.push(...handTips);
      }
    });
    
    // General improvement tips
    if (handMetrics.some(h => h.erratic_movement > MAX_ERRATIC)) {
      movementTips.push('Practice smooth, deliberate movements in front of a mirror');
    }
    if (handMetrics.some(h => h.average_speed > IDEAL_SPEED_MAX)) {
      movementTips.push('Slow down gestures and focus on quality over quantity');
    }
    if (handMetrics.some(h => h.total_distance < IDEAL_DISTANCE_MIN)) {
      movementTips.push('Expand gesture range to shoulder width for better impact');
    }
    if (handMetrics.some(h => h.score < 6)) {
      movementTips.push('Record yourself to identify specific areas for improvement');
    }

    return {
      movement_score: movementScore,
      hand_metrics: handMetrics,
      movement_tips: movementTips
    };
  };

  const toggle = () => { showOverlay.current = !showOverlay.current; };

  if (ui.finished) return null;

  return (
    <div>
      <div style={{ position: 'relative', width: W, height: H }}>
        <video
          ref={videoRef}
          width={W}
          height={H}
          muted
          playsInline
          style={{ borderRadius: 8, transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        />
      </div>
      <button onClick={toggle} style={{ margin: '8px 0' }}>
        {showOverlay.current ? 'Hide Overlay' : 'Show Overlay'}
      </button>
      
      {/* Live feedback display */}
      {ui.feedback && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#f0f8ff',
          borderRadius: '4px',
          borderLeft: '4px solid #4285f4',
          fontSize: '14px',
          textAlign: 'center',
          fontWeight: 'bold',
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {ui.feedback}
        </div>
      )}
      
      {!calibrated && (
        <div>
          <strong>Calibrating... Align your face inside the circle</strong><br/>
          Starting in: {ui.countdown}s
        </div>
      )}
    </div>
  );
}
