import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['dist', 'node_modules'],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
        Hls: 'readonly',
      },
      sourceType: 'module',
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
];
