/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink:     '#0B0B0F',
        bg:      '#FAFAF7',
        line:    '#E8E8E2',
        muted:   '#6B6B6B',
        surface: '#FFFFFF',
        accent:  '#FF2D2D',
        ok:      '#16A34A',
        warn:    '#F59E0B',
        info:    '#0EA5E9',
      },
      fontFamily: {
        display: ['BricolageGrotesque', 'System'],
        sans:    ['System'],
      },
    },
  },
  plugins: [],
};
