/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#102044',
        canvas: '#f5f7fb',
        mist: '#eef2f9',
        cyan: '#13b8b0',
        violet: '#7167f8',
      },
      boxShadow: {
        soft: '0 16px 50px rgba(26, 45, 92, 0.08)',
        card: '0 7px 24px rgba(27, 48, 95, 0.07)',
      },
    },
  },
  plugins: [],
}
