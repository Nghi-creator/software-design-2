import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const tokens = JSON.parse(
  fs.readFileSync(path.resolve(dirname, '../../design/tokens.json'), 'utf8'),
)

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: tokens.color,
      borderRadius: {
        'theme-sm': tokens.radius.sm,
        'theme-md': tokens.radius.md,
        'theme-lg': tokens.radius.lg,
        'theme-xl': tokens.radius.xl,
      },
      boxShadow: {
        'theme-sm': tokens.shadow.sm,
        'theme-md': tokens.shadow.md,
        'theme-glow': tokens.shadow.glow,
      },
      fontFamily: {
        sans: tokens.font.family.sans.split(', '),
      },
      spacing: {
        'theme-xs': tokens.spacing.xs,
        'theme-sm': tokens.spacing.sm,
        'theme-md': tokens.spacing.md,
        'theme-lg': tokens.spacing.lg,
        'theme-xl': tokens.spacing.xl,
        'theme-2xl': tokens.spacing['2xl'],
      },
    },
  },
}
