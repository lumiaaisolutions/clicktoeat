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
        // Triplets RGB para que Tailwind genere modificadores de opacidad
        // (text-ink/40, ring-accent/20…). Los hex --ce-* siguen existiendo
        // para estilos inline; ambos se definen en globals.css y el branding
        // por tenant inyecta los dos.
        ink:     'rgb(var(--ce-ink-rgb,     11 11 15) / <alpha-value>)',
        bg:      'rgb(var(--ce-bg-rgb,      250 250 247) / <alpha-value>)',
        line:    'rgb(var(--ce-line-rgb,    232 232 226) / <alpha-value>)',
        muted:   'rgb(var(--ce-muted-rgb,   107 107 107) / <alpha-value>)',
        surface: 'rgb(var(--ce-surface-rgb, 255 255 255) / <alpha-value>)',
        accent:  'rgb(var(--ce-accent-rgb,  242 106 31) / <alpha-value>)',
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
