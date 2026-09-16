import tailwindcssForms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'arabic': ['Amiri', 'serif'],
        'urdu': ['"Noto Nastaliq Urdu"', '"Jameel Noori Nastaleeq"', '"Urdu Typesetting"', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'islamic-green': {
          50: '#f0f9f4',
          100: '#dcf2e3',
          200: '#bbe5cb',
          300: '#8cd2a8',
          400: '#56b67d',
          500: '#359a5f',
          600: '#287d4a',
          700: '#22643d',
          800: '#1f5034',
          900: '#1c422d',
        },
        'gold': {
          50: '#fffbf0',
          100: '#fef3c7',
          200: '#fed488',
          300: '#feb048',
          400: '#fd9b28',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [
    tailwindcssForms,
  ],
};