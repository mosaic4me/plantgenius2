// @testing-library/jest-native is deprecated
// Jest matchers are now built into @testing-library/react-native v12.4+
import '@testing-library/react-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo modules
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      plantIdApiKey: 'test-api-key',
      plantIdApiUrl: 'https://test.api.com',
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-anon-key',
      smtp2goApiKey: 'test-smtp-key',
      smtp2goApiUrl: 'https://test.smtp.com',
      emailFrom: 'test@test.com',
      emailTo: 'test@test.com',
      paystackPublicKey: 'test-paystack-key',
      appEnv: 'test',
      debugMode: true,
    },
  },
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64',
  },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

// Mock React Native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Silence console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
