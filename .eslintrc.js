module.exports = {
  extends: ['wesbos/typescript'],
  rules: {
    'prettier/prettier': ['error', require('./.prettierrc.js')],
  },
};
