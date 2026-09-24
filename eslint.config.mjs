import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['app/**/*.{js,jsx}', 'components/**/*.{js,jsx}', 'lib/**/*.js', 'tests/**/*.{js,jsx}', 'middleware.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        console: 'readonly', process: 'readonly', fetch: 'readonly', URL: 'readonly', URLSearchParams: 'readonly',
        Request: 'readonly', Response: 'readonly', Headers: 'readonly', crypto: 'readonly', Buffer: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly', AbortController: 'readonly', AbortSignal: 'readonly',
        window: 'readonly', document: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly',
        TextEncoder: 'readonly', structuredClone: 'readonly', FormData: 'readonly', globalThis: 'readonly',
      },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'out/**', 'coverage/**', 'packages/**'] },
];
