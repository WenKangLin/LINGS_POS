/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#fececa',
          300: '#fcaba5',
          400: '#f87c72',
          500: '#ef5346',
          600: '#dc3626',
          700: '#b9291d',
          800: '#99261c',
          900: '#7f251e',
          950: '#450f0b',
        },
      },
    },
  },
  plugins: [],
};
