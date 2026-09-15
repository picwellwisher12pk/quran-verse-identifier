import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const Visualizer = ({ analyser, isRecording, width = '100%', height = 80 }) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const dataArrayRef = useRef(new Uint8Array(0));

  useEffect(() => {
    if (!analyser || !isRecording) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isRecording) return;
      
      animationFrameRef.current = requestAnimationFrame(draw);
      
      const WIDTH = canvas.width = canvas.offsetWidth;
      const HEIGHT = canvas.height = canvas.offsetHeight;
      
      analyser.getByteTimeDomainData(dataArrayRef.current);
      
      canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
      
      // Background subtle guide line
      canvasCtx.lineWidth = 1;
      canvasCtx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, HEIGHT / 2);
      canvasCtx.lineTo(WIDTH, HEIGHT / 2);
      canvasCtx.stroke();
      
      // Animated audio wave
      const gradient = canvasCtx.createLinearGradient(0, 0, WIDTH, 0);
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(0.5, '#6366f1');
      gradient.addColorStop(1, '#2563eb');
      
      canvasCtx.lineWidth = 3;
      canvasCtx.strokeStyle = gradient;
      canvasCtx.lineCap = 'round';
      canvasCtx.lineJoin = 'round';
      canvasCtx.beginPath();
      
      const sliceWidth = WIDTH * 1.0 / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArrayRef.current[i] / 128.0;
        const y = (v * HEIGHT) / 2;
        
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      canvasCtx.lineTo(WIDTH, HEIGHT / 2);
      canvasCtx.stroke();
    };
    
    draw();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, isRecording]);

  return (
    <div className="w-full bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 overflow-hidden shadow-inner">
      <canvas
        ref={canvasRef}
        className="w-full block"
        style={{ height: `${height}px`, width }}
      />
    </div>
  );
};

Visualizer.propTypes = {
  analyser: PropTypes.object,
  isRecording: PropTypes.bool.isRequired,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default Visualizer;
