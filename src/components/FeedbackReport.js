
import React from 'react';

function FeedbackReport({ report }) {
  return (
    <div className="feedback-report">
      <div className="scores-section">
        <h3>Performance Scores</h3>
        <div className="score-grid">
          <div className="score-item">
            <span className="score-label">Content:</span>
            <span className="score-value">{report.content_score}/10</span>
          </div>
          <div className="score-item">
            <span className="score-label">Voice:</span>
            <span className="score-value">{report.voice_score}/10</span>
          </div>
          <div className="score-item">
            <span className="score-label">Presence:</span>
            <span className="score-value">{report.face_score}/10</span>
          </div>
        </div>
      </div>

      <div className="overall-feedback-section">
        <h3>Overall Feedback</h3>
        <p className="overall-feedback">{report.overall_feedback}</p>
        <p className="interview-duration"><strong>Interview Duration:</strong> {report.interview_duration}</p>
      </div>

      <div className="strengths-section">
        <h3>Strengths</h3>
        <ul>
          {report.strengths.map((strength, index) => (
            <li key={index}>{strength}</li>
          ))}
        </ul>
      </div>

      <div className="improvements-section">
        <h3>Areas for Improvement</h3>
        <ul>
          {report.areas_for_improvement.map((improvement, index) => (
            <li key={index}>{improvement}</li>
          ))}
        </ul>
      </div>

      <div className="tips-section">
        <h3>Specific Tips</h3>
        <ul>
          {report.tips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </div>

      {report.transcript && (
        <div className="transcript-section">
          <h3>Interview Transcript</h3>
          <div className="transcript-content">
            <p>"{report.transcript}"</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeedbackReport;
