/**
 * Tailwind, compiled when the site is built (it used to load from cdn.tailwindcss.com on every visit).
 * Theme: Sistema Noche, the same tokens as the mobile version (frontend/app/src/styles.css).
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './App.tsx', './index.tsx', './{components,contexts,hooks,services,utils,entrevista,estrategia,brand-book,src,styles}/**/*.{ts,tsx}'],

  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['Unbounded', 'Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          dark: '#465362',
          bg: '#F4F7FE',
        },
        gray: {
          800: '#465362',
          900: '#465362',
        },
        // THEME COLOR: Magenta (Pixely brand identity)
        primary: {
          50: '#FFF0F7',
          100: '#FFE0F0',
          200: '#FFC2E1',
          300: '#FFA3D2',
          400: '#FF85C3',
          500: '#EB0C6E',
          600: '#D90B66',
          700: '#B00957',
        },
        accent: {
          50: '#FFF0F7',
          100: '#FFE0F0',
          200: '#FFC2E1',
          300: '#FFA3D2',
          400: '#FF85C3',
          500: '#EB0C6E',
          600: '#D90B66',
          700: '#B00957',
        },
        // Sistema Noche (same tokens as the mobile version, frontend/app/src/styles.css)
        ink: '#0A0A0C',
        card: '#16161B',
        raised: '#1F1F26',
        edge: '#26262E',
        line: '#33333C',
        mute: '#4A4A55',
        text: { 2: '#B4B4BE', 3: '#8A8A96', soft: '#E4E4EA' },
        carbon: '#141418',
        'carbon-2': '#1C1C22',
        paper: '#FFFFFF',
        mist: '#F3F3F5',
        // The app uses stock Tailwind pink/rose for gradients and accents
        // throughout (bg-gradient-to-r from-pink-500 to-rose-500, etc).
        // Remapped to the brand magenta ramp so every existing usage
        // picks up the real Pixely color without touching each file.
        pink: {
          DEFAULT: '#EB0C6E',
          fill: '#D90B66',
          text: '#FF85C3',
          soft: '#FFC2E1',
          50: '#FFF0F7',
          100: '#FFE0F0',
          200: '#FFC2E1',
          300: '#FFA3D2',
          400: '#FF85C3',
          500: '#EB0C6E',
          600: '#D90B66',
          700: '#B00957',
          800: '#8F0746',
          900: '#6E0535',
        },
        rose: {
          50: '#FFF0F7',
          100: '#FFE0F0',
          200: '#FFC2E1',
          300: '#FFA3D2',
          400: '#FF85C3',
          500: '#D90B66',
          600: '#B00957',
          700: '#8F0746',
          800: '#6E0535',
          900: '#52032A',
        },
        // STRICT CHART PALETTE
        chart: {
          yellow: '#f3dfa2',
          green: '#41ead4',
          red: '#ee4266',
          blue: '#63ADF2',
        },
        edu: {
          dark: '#465362',
          bg: '#F4F7FE',
        }
      },
      borderRadius: {
        lg: '12px',
        xl: '14px',
        '2xl': '22px',
        '3xl': '28px',
      },
      animation: {
        'draw': 'draw-check 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards',
        'scale-up-center': 'scale-up-center 0.5s cubic-bezier(0.390, 0.575, 0.565, 1.000) both',
        'fade-out': 'fade-out 0.5s ease-out both',
        'rotate-in': 'rotate-in 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) both',
        'fade-in-up': 'fade-in-up 0.8s ease-out both',
        'orbit-slow': 'orbit 60s linear infinite',
        'orbit-medium': 'orbit 45s linear infinite reverse',
        'orbit-fast': 'orbit 30s linear infinite',
        'reverse-orbit-slow': 'orbit 60s linear infinite reverse',
        'reverse-orbit-medium': 'orbit 45s linear infinite',
        'reverse-orbit-fast': 'orbit 30s linear infinite reverse',
        'float': 'float 3s ease-in-out infinite',
        'wave-bar': 'wave-bar 2s ease-in-out infinite',
        'needle-sweep': 'needle-sweep 4s ease-in-out infinite',
        'draw-path': 'draw-path 2s ease-out forwards',
      },
    }
  }
};
