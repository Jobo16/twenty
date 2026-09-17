import nxPreset from '../../jest.preset.js';

// Spread the root preset first: the package transform must replace the wider
// preset transform so domain specs consistently run through SWC.
const jestConfig = {
  ...nxPreset,
  displayName: 'scrm-domain',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': [
      '@swc/jest',
      { jsc: { parser: { syntax: 'typescript' } } },
    ],
  },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: './coverage',
};

export default jestConfig;
