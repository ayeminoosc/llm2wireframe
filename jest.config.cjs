/**
 * Use a CommonJS Jest config so it runs even if your project has "type":"module".
 * If you already have a Jest config, replace it with this or align options.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'cjs', 'json'],
  transform: {
    '^.+\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  }
};