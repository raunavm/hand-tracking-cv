import React, { useEffect, useRef } from 'react';

function VideoAudioProcessor({ onFinish }) {
  const videoRef = useRef();

  useEffect(() => {
    async function startCapture() {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoRef.current.srcObject = stream;
      videoRef.current.play();

      console.log("Video/audio capture started");

      // TODO: Add MediaPipe / audio analysis logic

      // Simulate end after 5 sec
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        const mockMetrics = { voice: { score: 3.5 }, face: { score: 4.2 } };
        const mockTranscript = "My greatest strength is resilience.";
        onFinish(mockMetrics, mockTranscript);
      }, 5000);
    }

    startCapture();
  }, [onFinish]);

  return <video ref={videoRef} width="400" height="300" />;
}

export default VideoAudioProcessor;
