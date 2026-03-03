import eslintPluginAstro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/', 'node_modules/', '.astro/'] },
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
];
