module.exports = {
  root: false,
  extends: ['../../../.eslintrc.cjs', 'next/core-web-vitals'],
  rules: {
    // Keep rules light here; override specifics within web app as needed.
  },
  overrides: [
    {
      // TypeScript already reports undefined names (including DOM/React ambient
      // types) and the base unused-vars rule misreads type-only signatures.
      files: ['**/*.ts', '**/*.tsx'],
      plugins: ['@typescript-eslint'],
      rules: {
        'no-undef': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'error'
      }
    },
    {
      // Plain Node config files cannot use next/babel's parser.
      files: ['*.config.js', '*.config.cjs'],
      parser: 'espree'
    }
  ]
};
