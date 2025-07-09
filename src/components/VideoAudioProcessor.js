import React, { useEffect, useRef, useState } from 'react';
import '@tensorflow/tfjs-backend-webgl';
import * as handpose from '@tensorflow-models/hand-pose-detection';

const W = 400, H = 300;
const TRAIL_LEN = 90;            // ~3s @30fps
const COLORS = ['yellow','orange'];
const MOVE_EPS = 2;
const ANGLE_THR = 1.0;

// only average speed & erratic
const TOO_LITTLE = m => m.speed < 100 && m.err < 3;
const TOO_MUCH   = m => m.speed > 300 || m.err > 7;

// mock final report
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
  const videoRef    = useRef();
  const canvasRef   = useRef();
  const rafRef      = useRef();
  const trails      = useRef([[],[]]);
  const showOverlay = useRef(true);

  const [ui, setUI] = useState({
    hand: [{speed:0,err:0},{speed:0,err:0}],
    feedback: 'Waiting for hands…',
    finished: false
  });

  useEffect(() => {
    let stream, detector;
    (async () => {
      // start webcam
      stream = await navigator.mediaDevices.getUserMedia({
        video:{width:W,height:H}, audio:true
      });
      const vid = videoRef.current;
      vid.srcObject = stream;
      await vid.play();
      vid.style.transform = 'scaleX(-1)';

      // setup canvas
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = W;
      canvasRef.current.height = H;

      // load model
      detector = await handpose.createDetector(
        handpose.SupportedModels.MediaPipeHands,
        { runtime:'tfjs', modelType:'lite', maxHands:2 }
      );

      // frame loop
      const loop = async () => {
        // wait until video ready
        if (!vid.videoWidth || !vid.videoHeight) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        const hands = await detector.estimateHands(vid);
        ctx.clearRect(0,0,W,H);

        // metrics & seen flags
        const seen = [false,false];
        const metrics = [{speed:0,err:0},{speed:0,err:0}];

        // draw & compute per hand
        for (let idx=0; idx<2; idx++) {
          const h = hands[idx];
          if (!h) {
            trails.current[idx] = [];
            continue;
          }
          seen[idx] = true;

          // track middle-finger base = keypoint 9
          const {x,y} = h.keypoints[9];
          const tr = trails.current[idx];
          tr.push({x,y});
          if (tr.length>TRAIL_LEN) tr.shift();

          // draw overlay only if allowed
          if (showOverlay.current) {
            // landmarks
            ctx.save(); ctx.translate(W,0); ctx.scale(-1,1);
            h.keypoints.forEach(pt=>{
              ctx.beginPath();
              ctx.arc(pt.x,pt.y,4,0,2*Math.PI);
              ctx.fillStyle='lime'; ctx.fill();
            });
            ctx.restore();

            // trail
            ctx.save(); ctx.translate(W,0); ctx.scale(-1,1);
            ctx.strokeStyle = COLORS[idx];
            ctx.lineWidth = 2;
            ctx.beginPath();
            tr.forEach((p,i)=>
              i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)
            );
            ctx.stroke();
            ctx.restore();

            // head-slot
            ctx.save();
            ctx.setLineDash([6,4]);
            ctx.strokeStyle='rgba(255,255,255,0.6)';
            ctx.lineWidth=2;
            ctx.beginPath();
            ctx.arc(W/2,H/3,60,0,Math.PI*2);
            ctx.stroke();
            ctx.restore();
          }

          // compute metrics
          const segs = tr.slice(1).map((p,i)=>{
            const dx=p.x-tr[i].x, dy=p.y-tr[i].y;
            return {d:Math.hypot(dx,dy), a:Math.atan2(dy,dx)};
          }).filter(s=>s.d>=MOVE_EPS);

          const total = segs.reduce((s,o)=>s+o.d,0);
          const speed = total/(tr.length/30);
          let turns=0;
          segs.forEach((s,i)=>{
            if(i>0){
              let dA=Math.abs(s.a-segs[i-1].a);
              if(dA>Math.PI) dA=2*Math.PI-dA;
              if(dA>ANGLE_THR) turns++;
            }
          });
          const err = turns/(tr.length/30);
          metrics[idx] = {speed,err};
        }

        // live feedback from left hand
        let fb = seen[0] 
          ? TOO_LITTLE(metrics[0]) ? 'Too little – gesture more'
            : TOO_MUCH(metrics[0]) ? 'Too much – slow down'
            : 'Just right'
          : 'No hands detected';

        setUI(u=>({ ...u, hand:metrics, feedback:fb }));
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();

      // stop after 30s
      setTimeout(()=>{
        cancelAnimationFrame(rafRef.current);
        stream.getTracks().forEach(t=>t.stop());
        setUI(u=>({...u, finished:true}));
        onFinish?.(MOCK_REPORT);
      }, 30000);
    })();

    return ()=>{
      rafRef.current && cancelAnimationFrame(rafRef.current);
      stream && stream.getTracks().forEach(t=>t.stop());
    };
  }, [onFinish]);

  // overlay toggle
  const toggle = () => {
    showOverlay.current = !showOverlay.current;
  };

  // render nothing if finished; parent shows feedback
  if (ui.finished) return null;

  return (
    <div>
      <div style={{position:'relative',width:W,height:H}}>
        <video ref={videoRef}
               width={W} height={H}
               muted playsInline
               style={{borderRadius:8,transform:'scaleX(-1)'}}/>
        <canvas ref={canvasRef}
                style={{position:'absolute',top:0,left:0,pointerEvents:'none'}}/>
      </div>
      <button onClick={toggle} style={{margin:'8px 0'}}>
        {showOverlay.current ? 'Hide Overlay' : 'Show Overlay'}
      </button>
      <div style={{fontSize:14}}>
        {ui.hand.map((h,i)=>(
          <div key={i}>
            <strong>Hand {i}:</strong>&nbsp;
            Avg {h.speed.toFixed(1)} px/s,&nbsp;
            Erratic {h.err.toFixed(1)} /s
          </div>
        ))}
        <div><strong>Movement:</strong> {ui.feedback}</div>
      </div>
    </div>
  );
}
