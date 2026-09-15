import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * High-performance oscilloscope audio waveform canvas.
 * Exactly matches the 3px teal border of the record button for a 1:1 seamless unwrap transition.
 */
const Visualizer = ({ analyser, isRecording, width = '100%', height = 90 }) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const dataArrayRef = useRef(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const bufferLength = analyser ? analyser.frequencyBinCount : 128;
    dataArrayRef.current = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      const dpr = window.devicePixelRatio || 1;
      const w = (canvas.width = (canvas.offsetWidth || 600) * dpr);
      const h = (canvas.height = (canvas.offsetHeight || 90) * dpr);
      ctx.clearRect(0, 0, w, h);

      const midY = h / 2;
      phaseRef.current += 0.06;

      let hasMicData = false;
      if (analyser && isRecording) {
        analyser.getByteTimeDomainData(dataArrayRef.current);
        hasMicData = true;
      }

      // 1. Baseline Horizon (subtle guide)
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.strokeStyle = 'rgba(13, 148, 136, 0.25)'; // subtle teal guide
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();

      // 2. Primary Oscilloscope Wave: exact 3px thickness matching the record button border
      ctx.beginPath();
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = '#0d9488'; // teal-600
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const points = 100;
      const sliceW = w / (points - 1);

      for (let i = 0; i < points; i++) {
        const x = i * sliceW;
        let y = midY;
        const windowFactor = Math.sin((Math.PI * i) / (points - 1)); // Hann envelope: pins ends to horizon

        if (hasMicData && dataArrayRef.current) {
          const dataIndex = Math.floor((i / points) * dataArrayRef.current.length);
          const v = (dataArrayRef.current[dataIndex] - 128) / 128.0;
          y = midY + v * (midY * 0.85) * windowFactor;
        } else if (isRecording) {
          // Ambient breathing line while soundbuffer initializes
          const wave = Math.sin(i * 0.16 + phaseRef.current) * 7 * windowFactor;
          y = midY + wave;
        }

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, isRecording]);

  return (
    <div className="w-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-full h-20 sm:h-24 max-w-xl mx-auto block"
        style={{ width, height }}
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
