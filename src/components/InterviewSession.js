import React, { useState } from 'react';
import VideoAudioProcessor from './VideoAudioProcessor';
import FeedbackReport from './FeedbackReport';

export default function InterviewSession() {
  const [stage, setStage] = useState('idle');
  const [report, setReport] = useState(null);

  const handleFinish = (cameraReport) => {
    setStage('processing');
    setTimeout(() => {
      setReport(cameraReport);
      setStage('report');
    }, 1500);
  };

  if (stage === 'report') return <FeedbackReport report={report} />;
  if (stage === 'processing') return <p>Analyzing your hand movements...</p>;
  if (stage === 'recording') return <VideoAudioProcessor onFinish={handleFinish} />;

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h2>Hand Gesture Analysis</h2>
      <p>We'll analyze your hand movements during the interview</p>
      <button 
        onClick={() => setStage('recording')}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Start Analysis
      </button>
    </div>
  );
}
