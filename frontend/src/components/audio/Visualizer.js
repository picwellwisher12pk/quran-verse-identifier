import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Morphing Audio Waveform Canvas
 * Renders an animated or live mic oscilloscope line that seamlessly
 * unrolls from a circle into a full-width soundwave, reacting to audio input.
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

      // Adapt to responsive display width
      const w = (canvas.width = canvas.offsetWidth * window.devicePixelRatio || 600);
      const h = (canvas.height = canvas.offsetHeight * window.devicePixelRatio || 90);
      ctx.clearRect(0, 0, w, h);

      const midY = h / 2;
      phaseRef.current += 0.05;

      let hasMicData = false;
      if (analyser && isRecording) {
        analyser.getByteTimeDomainData(dataArrayRef.current);
        hasMicData = true;
      }

      // Draw subtle horizon baseline
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.4)'; // slate-300
      ctx.lineWidth = 1 * window.devicePixelRatio;
      ctx.stroke();

      // Dynamic primary wave
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#0d9488');   // teal-600
      grad.addColorStop(0.5, '#06b6d4'); // cyan-500
      grad.addColorStop(1, '#0d9488');

      ctx.beginPath();
      ctx.lineWidth = 3 * window.devicePixelRatio;
      ctx.strokeStyle = grad;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const points = 100;
      const sliceW = w / (points - 1);

      for (let i = 0; i < points; i++) {
        const x = i * sliceW;
        let y = midY;

        if (hasMicData && dataArrayRef.current) {
          const dataIndex = Math.floor((i / points) * dataArrayRef.current.length);
          const v = (dataArrayRef.current[dataIndex] - 128) / 128.0; // -1.0 to 1.0
          // Apply a Hann window attenuation at boundaries so the line ends smoothly on the baseline
          const windowFactor = Math.sin((Math.PI * i) / (points - 1));
          y = midY + v * (midY * 0.9) * windowFactor;
        } else if (isRecording) {
          // Synthetic ambient idle pulse while waiting for mic buffer
          const windowFactor = Math.sin((Math.PI * i) / (points - 1));
          const wave = Math.sin(i * 0.15 + phaseRef.current) * 8 * windowFactor;
          y = midY + wave;
        }

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Secondary soft glow layer
      ctx.lineWidth = 6 * window.devicePixelRatio;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)'; // cyan glow
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
