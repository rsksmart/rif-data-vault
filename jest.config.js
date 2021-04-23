module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  reporters: ['default', 'jest-junit'],
  testResultsProcessor: 'jest-junit',
  testTimeout: 120000,
  globals: {
    'ts-jest': {
      tsConfig: './modules/tsconfig.settings.json'
    }
  }
}
