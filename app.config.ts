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
    // Environment variables exposed to app
    plantIdApiKey: process.env.PLANT_ID_API_KEY,
    plantIdApiUrl: process.env.PLANT_ID_API_URL || 'https://plant.id/api/v3/identification',
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    smtp2goApiKey: process.env.SMTP2GO_API_KEY,
    smtp2goApiUrl: process.env.SMTP2GO_API_URL || 'https://api.smtp2go.com/v3/email/send',
    emailFrom: process.env.EMAIL_FROM,
    emailTo: process.env.EMAIL_TO,
    paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY,
    sentryDsn: process.env.SENTRY_DSN,
    sentryEnabled: process.env.SENTRY_ENABLED === 'true' || process.env.APP_ENV === 'production',
    appEnv: process.env.APP_ENV || 'development',
    debugMode: process.env.DEBUG_MODE === 'true',
  },
});
