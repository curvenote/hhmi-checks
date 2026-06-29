module.exports = {
  root: true,
  extends: ['curvenote'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.turbo/',
    '*.config.js',
    '*.config.cjs',
    '*.config.mjs',
  ],
  overrides: [
    {
      files: ['**/*.spec.ts', '**/*.spec.tsx'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
      },
    },
  ],
};
