const { createCjsPreset } = require('jest-preset-angular/presets/index.js');

module.exports = {
  ...createCjsPreset(),
  roots: ['<rootDir>/libs/angular-google-charts/src'],
  resetMocks: true,
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/libs/angular-google-charts/tsconfig.spec.json',
      diagnostics: {
        ignoreCodes: [151001]
      }
    }
  }
};
