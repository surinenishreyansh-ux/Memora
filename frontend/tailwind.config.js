/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          900: '#0a0a0a',
          800: '#171717',
          700: '#262626',
        },
        accent: {
          light: '#fde047', // Yellow-300
          DEFAULT: '#eab308', // Yellow-500
          dark: '#ca8a04', // Yellow-600
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
