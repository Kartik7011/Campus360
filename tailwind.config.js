/** @type {import('tailwindcss').Config} */

// One blue family. `indigo` and `teal` both point here so every accent in the app is the same hue.
const brand = {
  50: '#eff5ff',
  100: '#dbe8fe',
  200: '#bfd5fe',
  300: '#93b8fd',
  400: '#6095fa',
  500: '#3b73f6',
  600: '#2558eb',
  700: '#1d45d8',
  800: '#1e3aaf',
  900: '#1e358a',
  950: '#152257',
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand,
        indigo: brand,
        teal: brand,
        ink: brand[900],
        canvas: '#f7f8fa',
      },
      borderRadius: {
        xl: '0.625rem',
        '2xl': '0.75rem',
        '3xl': '1rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17, 30, 51, 0.05)',
        soft: '0 12px 32px -16px rgba(17, 30, 51, 0.25)',
      },
    },
  },
  plugins: [],
}
