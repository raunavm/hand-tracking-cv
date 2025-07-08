import React from 'react';
import InterviewSession from './components/InterviewSession';
import FeedbackReport from './components/FeedbackReport';
import './theme.css';

function App() {
  const [report, setReport] = React.useState(null);

  return (
    <div className="mockly-container">
      <div className="mockly-card">
        {!report ? (
          <>
            <h1>Mockly AI Interview</h1>
            <InterviewSession onComplete={setReport} />
          </>
        ) : (
          <>
            <h1>Your Interview Feedback</h1>
            <FeedbackReport report={report} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
