/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f3e8ff',
          100: '#e9d5ff',
          200: '#d8b4fe',
          300: '#c084fc',
          400: '#a855f7',
          500: '#7C3AED',
          600: '#6D28D9',
          700: '#5B21B6',
          800: '#4C1D95',
          900: '#3B0764',
        },
        cyan: {
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
        },
        surface: {
          50:  '#E2E8F0',
          100: '#CBD5E1',
          200: '#94A3B8',
          300: '#64748B',
          400: '#475569',
          500: '#1E1E2E',
          600: '#181825',
          700: '#13131F',
          800: '#0F0F1A',
          900: '#0A0A12',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(124, 58, 237, 0.3)',
        'glow-cyan':   '0 0 20px rgba(6, 182, 212, 0.3)',
        'glow-mix':    '0 0 30px rgba(124, 58, 237, 0.2), 0 0 60px rgba(6, 182, 212, 0.1)',
        'card':        '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover':  '0 8px 32px rgba(124, 58, 237, 0.15)',
      },
      backgroundImage: {
        'gradient-brand':  'linear-gradient(135deg, #7C3AED, #06B6D4)',
        'gradient-brand-r': 'linear-gradient(to right, #7C3AED, #06B6D4)',
        'gradient-surface': 'linear-gradient(180deg, #13131F, #0F0F1A)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(124, 58, 237, 0.4)' },
        },
      },
    },
  },
  plugins: [],
};
