
import React from 'react';
import VideoAudioProcessor from './VideoAudioProcessor';

function InterviewSession({ onComplete }) {
  const [isRunning, setIsRunning] = React.useState(false);

  const handleFinish = (metrics, transcript) => {
    // Template data instead of backend call
    const templateReport = {
      content_score: 8.5,
      voice_score: 7.2,
      face_score: 9.1,
      tips: [
        "Great job maintaining eye contact throughout the interview!",
        "Your voice was clear and confident. Consider varying your pace slightly for emphasis.",
        "Excellent use of specific examples when discussing your experiences.",
        "Try to elaborate more on your problem-solving process in future interviews."
      ],
      overall_feedback: "Strong performance with clear communication and good presence. Continue practicing to build even more confidence.",
      strengths: [
        "Professional appearance and demeanor",
        "Clear articulation and speaking pace",
        "Good use of examples and stories",
        "Maintained composure under pressure"
      ],
      areas_for_improvement: [
        "Could provide more specific metrics when discussing achievements",
        "Practice transitioning between topics more smoothly",
        "Work on concluding answers with stronger impact statements"
      ],
      interview_duration: "4 minutes 32 seconds",
      transcript: transcript
    };

    // Simulate processing delay
    setTimeout(() => {
      onComplete(templateReport);
    }, 1500);
  };

  return (
    <div>
      <button onClick={() => setIsRunning(true)}>Start Interview</button>
      {isRunning && (
        <VideoAudioProcessor onFinish={handleFinish} />
      )}
    </div>
  );
}

export default InterviewSession;
