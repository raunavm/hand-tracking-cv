import React, { useState } from 'react';
import VideoAudioProcessor from './VideoAudioProcessor';
import FeedbackReport      from './FeedbackReport';

export default function InterviewSession() {
  const [stage,  setStage]  = useState('idle');   // idle | recording | processing | report
  const [report, setReport] = useState(null);

  const handleFinish = (cameraReport) => {
    setStage('processing');          // hide camera

    const finalReport = {
      ...cameraReport,
      content_score: 8.5,
      voice_score:   7.2,
      face_score:    9.1,
      overall_feedback:
        'Strong performance with clear communication and good presence.',
      strengths: [
        'Professional demeanor',
        'Clear articulation',
        'Good storytelling',
        'Stayed composed under pressure',
      ],
      areas_for_improvement: [
        'Add quantitative results to achievements',
        'Smoother topic transitions',
        'Stronger conclusions',
      ],
      tips: [
        'Maintain eye contact.',
        'Vary voice pace for emphasis.',
        'Use stronger wrap-up statements.',
      ],
      interview_duration: '0 min 05 s',
    };

    setTimeout(() => {
      setReport(finalReport);
      setStage('report');
    }, 1500);
  };

  if (stage === 'report')     return <FeedbackReport report={report} />;
  if (stage === 'processing') return <p>Generating feedback…</p>;
  if (stage === 'recording')  return <VideoAudioProcessor onFinish={handleFinish} />;

  return <button onClick={() => setStage('recording')}>Start Interview</button>;
}
