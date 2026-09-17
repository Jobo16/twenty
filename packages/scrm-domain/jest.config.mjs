const jestConfig = {
  displayName: 'scrm-domain',
  preset: '../../jest.preset.js',
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
