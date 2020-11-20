module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  reporters: ['default', 'jest-junit'],
  testResultsProcessor: 'jest-junit',
  globals: {
    'ts-jest': {
      tsConfig: './modules/tsconfig.settings.json'
    }
  }
}
