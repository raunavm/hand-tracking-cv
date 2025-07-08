
import React from 'react';

function FeedbackReport({ report }) {
  return (
    <div>
      <h2>Interview Feedback</h2>
      <p>Content Score: {report.content_score}</p>
      <p>Voice Score: {report.voice_score}</p>
      <p>Face Score: {report.face_score}</p>
      <pre>{JSON.stringify(report.tips, null, 2)}</pre>
    </div>
  );
}

export default FeedbackReport;
