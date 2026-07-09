/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@capacitor/(.*)$': '<rootDir>/__mocks__/capacitor/$1.ts',
    '^@capacitor-community/media$': '<rootDir>/__mocks__/@capacitor-community/media.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
};
