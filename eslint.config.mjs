// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  { ignores: ['.agents/**', '.claude/**'] },
  {
    rules: {
      // En Nuxt, los fetch responses y catch blocks usan `any` de forma legítima
      '@typescript-eslint/no-explicit-any': 'warn',
      // Guardas de validación en una línea son legibles: if (!x) { msg = '...'; return }
      '@stylistic/max-statements-per-line': ['error', { max: 3 }],
      // Catch blocks vacíos permitidos (errores silenciosos intencionales)
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  }
)
