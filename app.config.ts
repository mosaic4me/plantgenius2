import 'dotenv/config';
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PlantGenius',
  slug: 'plantgenius',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'plantgenius',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.plantsgenius.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.plantsgenius.app',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        imageSource: './assets/images/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Pl@ntNet API
    plantnetApiKey: process.env.PLANTNET_API_KEY || '2b10ljY2KkrPghrnquDKbQ8V2',
    plantnetApiUrl: process.env.PLANTNET_API_URL || 'https://my-api.plantnet.org/v2/identify/all',

    // MongoDB Backend API
    mongodbApiUrl: process.env.MONGODB_API_URL || 'http://localhost:3000/api',

    // Google Sign In
    googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
    googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,

    // Apple Sign In (iOS)
    appleSignInEnabled: process.env.APPLE_SIGN_IN_ENABLED === 'true',

    // Email Service
    smtp2goApiKey: process.env.SMTP2GO_API_KEY,
    smtp2goApiUrl: process.env.SMTP2GO_API_URL || 'https://api.smtp2go.com/v3/email/send',
    emailFrom: process.env.EMAIL_FROM,
    emailTo: process.env.EMAIL_TO,

    // Payment
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY,
    paystackSecretKey: process.env.PAYSTACK_SECRET_KEY,

    // Error Tracking
    sentryDsn: process.env.SENTRY_DSN,
    sentryEnabled: process.env.SENTRY_ENABLED === 'true' || process.env.APP_ENV === 'production',

    // App Configuration
    appEnv: process.env.APP_ENV || 'development',
    debugMode: process.env.DEBUG_MODE !== 'false',
  },
});
