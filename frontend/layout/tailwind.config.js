/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            // Design Tokens: Typography (matches lam218313-beep/Pixely_web)
            fontFamily: {
                sans: ['"Albert Sans"', 'Arial', 'sans-serif'],
                display: ['"Bricolage Grotesque"', 'Arial', 'sans-serif'],
            },

            // Design Tokens: Border Radius
            // Pixely brand identity only defines two radii: 8px for buttons/
            // controls, 12px for cards. Collapsed onto Tailwind's default
            // scale so every existing rounded-xl/2xl/3xl in the app inherits
            // the real shape language without editing each component.
            borderRadius: {
                'card': '32px',
                'container': '40px',
                'button': '16px',
                'input': '12px',
                'badge': '8px',
                lg: '8px',
                xl: '8px',
                '2xl': '12px',
                '3xl': '12px',
            },

            // Design Tokens: Spacing
            spacing: {
                '18': '4.5rem',   // 72px
                '88': '22rem',    // 352px (sidebar collapsed)
                '128': '32rem',   // 512px
            },

            // Design Tokens: Colors
            colors: {
                'brand-bg': '#F8F9FA',
                'brand-dark': '#1E293B',
                'primary': {
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
                'chart': {
                    red: '#EF4444',
                    yellow: '#F59E0B',
                    green: '#10B981',
                    blue: '#3B82F6',
                },
                // Pixely brand identity tokens (mirrors lam218313-beep/Pixely_web src/styles/tokens.css)
                'ink': '#0A0A0C',
                'carbon': '#141418',
                'carbon-2': '#1C1C22',
                'paper': '#FFFFFF',
                'mist': '#F3F3F5',
                'line-ink': 'rgba(255, 255, 255, 0.10)',
                'line-paper': '#E4E4E8',
                // The app uses stock Tailwind pink/rose for gradients and
                // accents throughout (bg-gradient-to-r from-pink-500 to-rose-500,
                // etc). Remapped to the brand magenta ramp so every existing
                // usage picks up the real Pixely color without touching each file.
                'pink': {
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
                'rose': {
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
            },

            // Documented Breakpoints
            screens: {
                'xs': '475px',
                'sm': '640px',
                'md': '768px',
                'lg': '1024px',
                'xl': '1280px',
                '2xl': '1536px',
            },
        },
    },
    plugins: [
        // Custom scrollbar utilities
        function ({ addUtilities }) {
            addUtilities({
                '.scrollbar-thin': {
                    'scrollbar-width': 'thin',
                },
                '.scrollbar-thumb-gray-300': {
                    'scrollbar-color': '#D1D5DB transparent',
                },
                '.scrollbar-track-transparent': {
                    'scrollbar-color': 'transparent transparent',
                },
            });
        },
    ],
}
