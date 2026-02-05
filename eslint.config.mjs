import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import sortKeysFix from 'eslint-plugin-sort-keys-fix';
import tsSortKeys from 'eslint-plugin-typescript-sort-keys';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      'sort-keys-fix': sortKeysFix,
      'typescript-sort-keys': tsSortKeys,
    },
    rules: {
      'react/display-name': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'sort-keys-fix/sort-keys-fix': 'off', // Disable the rule to avoid errors
      'typescript-sort-keys/interface': 'off', // Disable the rule to avoid errors
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    '',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
