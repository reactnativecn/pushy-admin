module.exports = {
  extends: ['wesbos/typescript'],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    'prettier/prettier': ['error', require('./.prettierrc.js')],
    'import/no-unresolved': 'off',
  },
};
