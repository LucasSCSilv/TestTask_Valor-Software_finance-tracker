/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#070B14',
          900: '#0D1220',
          800: '#111827',
          700: '#1a2235',
          600: '#243047',
        },
        gold: {
          300: '#f0d080',
          400: '#e8c04a',
          500: '#d4a017',
        },
      },
    },
  },
  plugins: [],
}
