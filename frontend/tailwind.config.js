/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        ink: '#102a43',
        mist: '#f1f5f9',
        pulse: '#0f766e'
      }
    }
  },
  plugins: []
};
