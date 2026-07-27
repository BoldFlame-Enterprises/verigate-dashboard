/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gray: {
          50: '#f7f8fb',
          100: '#eef1f6',
          200: '#dbe1ea',
          300: '#c2ccd9',
          400: '#8997aa',
          500: '#66758a',
          600: '#4b5b70',
          700: '#344156',
          800: '#202b3d',
          900: '#131c2b',
          950: '#080d17',
        },
        brand: {
          50: '#f0f2ff',
          100: '#e2e6ff',
          200: '#cbd1ff',
          300: '#a9b1ff',
          400: '#818cf8',
          500: '#6973ee',
          600: '#565ddb',
          700: '#474cb8',
          800: '#3a3e8e',
          900: '#30336f',
          950: '#1a1d45',
        },
      },
    },
  },
  darkMode: 'media',
  plugins: [],
};
