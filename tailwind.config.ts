import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#59a985',
          'green-light': '#F2FDFB',
          navy: '#171C33',
          border: '#E8EAED',
          subtle: '#FAFBFC',
          gray: '#9BA0AB',
          body: '#4a4a4a',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
      },
    },
  },
  plugins: [],
};

export default config;
