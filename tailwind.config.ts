import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#00727A',
          medium: '#66A5AD',
          light: '#B2D8D8',
          50: '#f0fafa',
          100: '#d0f0f2',
          200: '#a0e0e5',
          300: '#66A5AD',
          400: '#3d8f98',
          500: '#00727A',
          600: '#005d64',
          700: '#004a50',
          800: '#003740',
          900: '#002530',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
export default config
