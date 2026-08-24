import type { Config } from 'tailwindcss';

// 디자인 토큰: design_handoff_formflow_ui/README.md §Design Tokens / §Tailwind 매핑 제안
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#378ADD',
          light: '#E6F1FB',
          dark: '#0C447C',
        },
        ink: {
          900: '#16181d',
          700: '#3c424d',
          500: '#5c6270',
          400: '#8b919e',
          300: '#9aa0aa',
          200: '#a6acb5',
        },
        line: {
          DEFAULT: '#e8eaed',
          soft: '#f0f1f3',
          softer: '#f5f6f7',
          input: '#dfe2e6',
        },
        surface: {
          fill: '#f2f3f5',
          'fill-hover': '#eceef1',
          subtle: '#fafbfc',
          page: '#f7f8f9',
        },
        ok: { fg: '#186a3b', bg: '#e7f6ec' },
        warn: { fg: '#8a5a00', bg: '#fdf3e0' },
        danger: {
          fg: '#b42318',
          accent: '#d14343',
          bg: '#fdf3f2',
          'bg-strong': '#fde9e7',
          border: '#f4c9c4',
        },
        admin: { fg: '#5b3fa8', bg: '#f1edfb' },
      },
      boxShadow: {
        focus: '0 0 0 3px rgba(55,138,221,0.14)',
      },
    },
  },
  plugins: [],
};

export default config;
