import type { Config } from 'jest';
import { createCjsPreset } from 'jest-preset-angular/presets/index.js';

export default {
  ...createCjsPreset(),
  setupFilesAfterEnv: ['<rootDir>/libs/angular-google-charts/src/setup-tests.ts'],
  globalSetup: 'jest-preset-angular/build/config/global-setup.js',
  resetMocks: true,
  globals: {
    'ts-jest': {
      diagnostics: {
        ignoreCodes: [151001]
      }
    }
  }
} satisfies Config;
