/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        carbon:   '#1E1E1E',
        ember:    '#E05C00',
        'warm-white': '#F0EBE0',
        graphite: '#2E2E2E',
        wheat:    '#D4B483',
        stone:    '#7A7060',
      },
      fontFamily: {
        heading: ['"Barlow Condensed"', 'sans-serif'],
        body:    ['"Source Serif 4"', 'serif'],
        mono:    ['"DM Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
