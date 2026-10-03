import babelParser from '@babel/eslint-parser';

export default [
  { ignores: ['node_modules/**', 'dist/**', 'evidence/**'] },
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    languageOptions: { parser: babelParser, parserOptions: { requireConfigFile: false, babelOptions: { presets: [['@babel/preset-typescript', { allExtensions: true, isTSX: true }]] } } },
    rules: {
      'constructor-super': 'error',
      'no-debugger': 'error',
      'no-duplicate-case': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'valid-typeof': 'error',
    },
  },
];
