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
      
      canvasCtx.fillStyle = 'rgb(255, 255, 255)';
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
      
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(99, 102, 241)';
      canvasCtx.beginPath();
      
      const sliceWidth = WIDTH * 1.0 / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArrayRef.current[i] / 128.0;
        const y = v * HEIGHT / 2;
        
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
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
    <div className="w-full bg-white p-4 rounded-lg border border-gray-200">
      <canvas
        ref={canvasRef}
        className="w-full"
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
