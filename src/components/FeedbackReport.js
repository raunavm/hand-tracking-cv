import React from 'react';

function FeedbackReport({ report }) {
  // Get score category with color coding
  const getScoreCategory = (score) => {
    if (score >= 8) return { text: 'Excellent', color: '#28a745' };
    if (score >= 6) return { text: 'Good', color: '#ffc107' };
    if (score >= 4) return { text: 'Fair', color: '#fd7e14' };
    return { text: 'Needs Improvement', color: '#dc3545' };
  };

  const scoreCategory = getScoreCategory(report.movement_score);

  // Generate metric-based tips
  const generateMetricTips = () => {
    const tips = [];
    
    // Overall score explanation
    let scoreExplanation = '';
    if (report.movement_score >= 8) {
      scoreExplanation = 'Excellent - Your gestures were natural and effective';
    } else if (report.movement_score >= 6) {
      scoreExplanation = 'Good - Solid foundation with some room for refinement';
    } else if (report.movement_score >= 4) {
      scoreExplanation = 'Fair - Needs more consistency in gesture quality';
    } else {
      scoreExplanation = 'Needs Improvement - Focus on gesture control';
    }
    tips.push(`Overall Score: ${report.movement_score.toFixed(1)}/10 - ${scoreExplanation}`);
    
    // Analyze metrics for each hand
    report.hand_metrics.forEach(hand => {
      const handTips = [];
      
      // Distance analysis (removed pixel values)
      if (hand.total_distance < 1500) {
        handTips.push(`Total distance too low - Use broader gestures`);
      } else if (hand.total_distance > 3000) {
        handTips.push(`Total distance too high - Keep gestures more contained`);
      }
      
      // Speed analysis (removed pixel values)
      if (hand.average_speed < 100) {
        handTips.push(`Speed too low - Increase movement pace`);
      } else if (hand.average_speed > 130) {
        handTips.push(`Speed too high - Slow down movements`);
      }
      
      // Erratic movement analysis (removed frequency values)
      if (hand.erratic_movement > 3) {
        handTips.push(`Erratic movements too frequent - Focus on smoother motions`);
      } else if (hand.erratic_movement < 1.5) {
        handTips.push(`Erratic movements well-controlled - Good job!`);
      }
      
      // Score analysis (kept score values as they're not pixel-based)
      if (hand.score < 4) {
        handTips.push(`Score too low (${hand.score.toFixed(1)}/10) - Practice more controlled gestures`);
      } else if (hand.score < 6) {
        handTips.push(`Score needs improvement (${hand.score.toFixed(1)}/10) - Work on consistency`);
      } else if (hand.score >= 8) {
        handTips.push(`Excellent score (${hand.score.toFixed(1)}/10) - Maintain your effective gestures`);
      }
      
      if (handTips.length > 0) {
        tips.push(`${hand.hand} Analysis:`);
        tips.push(...handTips);
      }
    });
    
    // General improvement tips based on metrics
    if (report.hand_metrics.some(h => h.erratic_movement > 3)) {
      tips.push('General Tip: Practice smooth, deliberate movements in front of a mirror');
    }
    if (report.hand_metrics.some(h => h.average_speed > 130)) {
      tips.push('General Tip: Slow down gestures and focus on quality over quantity');
    }
    if (report.hand_metrics.some(h => h.total_distance < 1500)) {
      tips.push('General Tip: Expand your gesture range to shoulder width for better impact');
    }
    if (report.hand_metrics.some(h => h.score < 6)) {
      tips.push('General Tip: Record yourself to identify specific areas for improvement');
    }
    
    return tips;
  };

  const metricTips = generateMetricTips();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#2c3e50' }}>Hand Movement Analysis Report</h2>
      
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '30px', 
        padding: '20px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h3>Overall Movement Score</h3>
        <div style={{ 
          fontSize: '48px', 
          fontWeight: 'bold', 
          color: '#2c3e50', 
          margin: '10px 0' 
        }}>
          {report.movement_score.toFixed(1)}/10
        </div>
        <div style={{
          fontSize: '20px',
          color: scoreCategory.color,
          fontWeight: 'bold',
          marginBottom: '15px'
        }}>
          {scoreCategory.text}
        </div>
        <div style={{ 
          fontSize: '16px', 
          color: '#555',
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: '1.5'
        }}>
          {metricTips.length > 0 && metricTips[0]}
        </div>
      </div>

      {report.hand_metrics && report.hand_metrics.length > 0 && (
        <div style={{ 
          marginBottom: '30px', 
          padding: '20px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h3>Detailed Hand Metrics</h3>
          {report.hand_metrics.map((hand, index) => (
            <div key={index} style={{ 
              marginBottom: '20px', 
              paddingBottom: '20px', 
              borderBottom: '1px solid #e0e0e0'
            }}>
              <h4 style={{ 
                color: '#2c3e50', 
                paddingBottom: '8px',
                borderBottom: '2px solid #eee'
              }}>
                {hand.hand}
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '15px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '15px', 
                  backgroundColor: 'white', 
                  borderRadius: '6px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}>
                  <span style={{ fontWeight: 'bold' }}>Total Distance:</span>
                  <span>{hand.total_distance.toFixed(1)} px</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '15px', 
                  backgroundColor: 'white', 
                  borderRadius: '6px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}>
                  <span style={{ fontWeight: 'bold' }}>Average Speed:</span>
                  <span>{hand.average_speed.toFixed(1)} px/s</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '15px', 
                  backgroundColor: 'white', 
                  borderRadius: '6px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}>
                  <span style={{ fontWeight: 'bold' }}>Erratic Movements:</span>
                  <span>{hand.erratic_movement.toFixed(1)}/s</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '15px', 
                  backgroundColor: 'white', 
                  borderRadius: '6px', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}>
                  <span style={{ fontWeight: 'bold' }}>Hand Score:</span>
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: hand.score >= 8 ? '#28a745' : 
                           hand.score >= 6 ? '#ffc107' : '#dc3545'
                  }}>
                    {hand.score.toFixed(1)}/10
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {metricTips.length > 0 && (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h3>Metric-Based Improvement Tips</h3>
          <ul style={{ 
            backgroundColor: 'white', 
            borderRadius: '6px', 
            padding: '20px',
            marginTop: '15px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            listStyleType: 'none',
            paddingLeft: '0'
          }}>
            {metricTips.slice(1).map((tip, index) => (
              <li key={index} style={{ 
                padding: '12px 15px 12px 40px',
                marginBottom: '10px',
                lineHeight: '1.5',
                position: 'relative',
                backgroundColor: '#fff',
                borderLeft: tip.includes('General Tip') ? '3px solid #34a853' : 
                             tip.includes('Analysis:') ? '3px solid #4285f4' : '3px solid #fbbc05',
                borderRadius: '0 4px 4px 0'
              }}>
                <span style={{
                  position: 'absolute',
                  left: '10px',
                  top: '12px',
                  width: '20px',
                  height: '20px',
                  backgroundColor: tip.includes('General Tip') ? '#34a853' : 
                                  tip.includes('Analysis:') ? '#4285f4' : '#fbbc05',
                  borderRadius: '50%',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {index + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FeedbackReport;
