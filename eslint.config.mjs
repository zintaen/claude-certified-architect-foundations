import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        alert: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        navigator: 'readonly',
        Promise: 'readonly',
        Math: 'readonly',
        Date: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        indexedDB: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
    },
  },
  // Node.js scripts (CommonJS) — need `require`, `process`, `__dirname`, etc.
  {
    files: ['sync_to_supabase.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
      },
    },
  },
  // Node.js config files (ESM) — need `process`
  {
    files: ['playwright.config.js', 'vite.config.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
      },
    },
  },
];
