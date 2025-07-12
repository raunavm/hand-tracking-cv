# Hand Tracking CV Project

## Features

- **Face Calibration**: Quick 5‑second baseline to detect face alignment.  
- **Real‑Time Tracking**: 30‑second session with live hand‑pose and face‑presence analysis.  
- **Visual Feedback**: On‑screen prompts ("Too much," "Too little," "Just right") and an overlay toggle for keypoints/trails.  
- **Post‑Session Report**: Movement metrics, a 0–10 score, transcript, and targeted improvement tips.

---

## Project Structure

```bash
public/
src/
├── components/
│ ├── FeedbackReport.js # Renders detailed performance report
│ ├── InterviewSession.js # Drives calibration, recording & analysis phases
│ └── VideoAudioProcessor.js # Captures & processes video/audio streams
├── App.js # Main application entrypoint
├── index.js # React DOM bootstrap
theme.css # Global styles
package.json # Dependencies & scripts
README.md # Project overview (this file)
```

---

## Prerequisites

- **Node.js** v14 or higher  
- Modern browser with WebGL support (Chrome or Firefox recommended)  
- Access to webcam and microphone  

---

## Installation

1. Clone the repo and `cd` into it:  
   ```bash
   git clone https://github.com/your-org/interview-analyzer.git
   cd interview-analyzer


2. Install core dependencies:
```bash
npm install
```

3. Install TensorFlow.js and models:
```bash
npm install @tensorflow/tfjs-backend-webgl
npm install @tensorflow-models/hand-pose-detection
npm install @tensorflow-models/face-landmarks-detection
```

Start the development server:
'''bash
npm start
```

## Usage Pipeline

1. **Calibration (5 seconds)**  
   - User aligns face within the circle  
   - System establishes baseline measurements  

2. **Recording (30 seconds)**  
   - Real-time hand tracking and analysis  
   - Live feedback displayed (“Too much”, “Too little”, “Just right”)  
   - Overlay toggle for visualization (keypoints and trails)  

3. **Analysis & Report**  
   - Movement metrics calculation  
   - Score generation (0–10 scale)  
   - Detailed feedback report with improvement tips  

## Key Features

**Video/Audio Processing Pipeline** (`VideoAudioProcessor.js`)
- TensorFlow.js hand-tracking  
- Face-landmarks detection for presence checks  
- 30-second session recorder  

**Interview Session Flow** (`InterviewSession.js`)
- 5s calibration  
- 30s analysis  
- Triggers report generation  

**Feedback Report** (`FeedbackReport.js`)
- Overall and category-specific scores (Content, Voice, Presence)  
- Strengths & improvement areas with actionable tips  
- Full transcript display  

## Next Steps

- Gather diverse hand-movement videos to refine normalization benchmarks  
- Integrate all components into a cohesive single-page experience  
- Add a Settings panel for custom calibration (IOD, thresholds)  
- Enhance live feedback (visual cues) and post-session analytics  
- Implement Web Speech API for real-time speech analysis  
- Add multi-session progress tracking  
