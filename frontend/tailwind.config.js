/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Modern Purple/Violet Theme
        dark: {
          bg: '#0f0a1e',
          surface: '#1a1333',
          border: '#2d2548',
          text: '#f0edf7',
          muted: '#a199b8',
        },
        primary: {
          DEFAULT: '#7c3aed',
          hover: '#6d28d9',
          light: '#a78bfa',
          dark: '#5b21b6',
        },
        success: {
          DEFAULT: '#10b981',
          light: '#34d399',
          dark: '#059669',
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fbbf24',
          dark: '#d97706',
          bg: '#422006',
        },
        danger: {
          DEFAULT: '#ef4444',
          light: '#f87171',
          dark: '#dc2626',
        },
        info: {
          DEFAULT: '#3b82f6',
          light: '#60a5fa',
          dark: '#2563eb',
        },
        purple: {
          DEFAULT: '#8b5cf6',
          light: '#a78bfa',
          dark: '#7c3aed',
        },
        violet: {
          DEFAULT: '#7c3aed',
          light: '#a78bfa',
          dark: '#6d28d9',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-purple': 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        'gradient-blue-purple': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'pulse-slow': 'pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
        'spin-slow': 'spin-slow 1.5s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(124, 58, 237, 0.4)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.4)',
        'glow-danger': '0 0 20px rgba(239, 68, 68, 0.4)',
        'glow-warning': '0 0 20px rgba(245, 158, 11, 0.4)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
