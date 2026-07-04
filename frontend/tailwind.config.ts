import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary accent
        accent: {
          DEFAULT: '#3b82f6',
          glow:    'rgba(59,130,246,0.25)',
        },
        // Surface layers
        surface: {
          base:     '#0b0b14',
          DEFAULT:  '#111119',
          elevated: '#16161f',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'SF Pro Display', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'Menlo', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
