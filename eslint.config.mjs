import eslintPluginAstro from 'eslint-plugin-astro'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'

export default [
  { ignores: ['dist/', 'node_modules/', '.astro/'] },
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      semi: ['error', 'never'],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/member-delimiter-style': ['error', {
        multiline: { delimiter: 'none' },
        singleline: { delimiter: 'comma', requireLast: false },
      }],
    },
  },
]
