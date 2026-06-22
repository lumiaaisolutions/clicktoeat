import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  darkMode: 'class',
  theme: {
    screens: {
      xs:   '380px',   // iPhone SE y similares
      sm:   '640px',
      md:   '768px',
      lg:   '1024px',
      xl:   '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans:    ['Geist', 'system-ui', 'sans-serif'],
        mono:    ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink:     'var(--ce-ink,     #0B0B0F)',
        bg:      'var(--ce-bg,      #FAFAF7)',
        line:    'var(--ce-line,    #E8E8E2)',
        muted:   'var(--ce-muted,   #6B6B6B)',
        surface: 'var(--ce-surface, #FFFFFF)',
        accent:  'var(--ce-accent,  #F26A1F)',
      },
      borderRadius: {
        xl:  '14px',
        '2xl': '20px',
        '3xl': '28px',
      },
      boxShadow: {
        soft:  '0 4px 20px -8px rgba(11,11,15,0.10)',
        glass: '0 8px 32px -12px rgba(11,11,15,0.18)',
      },
      backdropBlur: { xs: '2px' },
      animation: {
        'fade-in': 'fadeIn .4s ease both',
        'slide-up': 'slideUp .35s cubic-bezier(.2,.8,.2,1) both',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },           to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};

export default config;
