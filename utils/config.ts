import Constants from 'expo-constants';

interface AppConfig {
  // Pl@ntNet API Configuration
  plantnetApiKey: string;
  plantnetApiUrl: string;

  // MongoDB Configuration
  mongodbApiUrl: string;

  // Google Sign In Configuration
  googleAndroidClientId: string;
  googleIosClientId: string;
  googleWebClientId: string;

  // Apple Sign In Configuration (iOS only)
  appleSignInEnabled: boolean;

  // Email Service Configuration
  smtp2goApiKey: string;
  smtp2goApiUrl: string;
  emailFrom: string;
  emailTo: string;

  // Payment Configuration
  paystackPublicKey: string;
  paystackSecretKey: string;

  // Error Tracking Configuration
  sentryDsn: string;
  sentryEnabled: boolean;

  // App Configuration
  appEnv: 'development' | 'staging' | 'production';
  debugMode: boolean;
}

const getConfig = (): AppConfig => {
  const extra = Constants.expoConfig?.extra || {};

  // Validate required environment variables
  const requiredVars = [
    'plantnetApiKey',
    'mongodbApiUrl',
  ];

  const missingVars = requiredVars.filter(key => !extra[key]);

  if (missingVars.length > 0) {
    console.warn(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please ensure your .env file is properly configured.'
    );
  }

  return {
    // Pl@ntNet API
    // SECURITY: Removed hardcoded fallback - API key must be in environment
    plantnetApiKey: extra.plantnetApiKey || '',
    plantnetApiUrl: extra.plantnetApiUrl || 'https://my-api.plantnet.org/v2/identify/all',

    // MongoDB Backend API
    // SECURITY: No fallback - backend URL must be explicitly configured
    mongodbApiUrl: extra.mongodbApiUrl || '',

    // Google Sign In
    googleAndroidClientId: extra.googleAndroidClientId || '',
    googleIosClientId: extra.googleIosClientId || '',
    googleWebClientId: extra.googleWebClientId || '',

    // Apple Sign In (iOS)
    appleSignInEnabled: extra.appleSignInEnabled === true,

    // Email Service
    smtp2goApiKey: extra.smtp2goApiKey || '',
    smtp2goApiUrl: extra.smtp2goApiUrl || 'https://api.smtp2go.com/v3/email/send',
    emailFrom: extra.emailFrom || '',
    emailTo: extra.emailTo || '',

    // Payment
    paystackPublicKey: extra.paystackPublicKey || '',
    paystackSecretKey: extra.paystackSecretKey || '',

    // Error Tracking
    sentryDsn: extra.sentryDsn || '',
    sentryEnabled: extra.sentryEnabled === true || extra.appEnv === 'production',

    // App Settings
    appEnv: (extra.appEnv || 'development') as 'development' | 'staging' | 'production',
    debugMode: extra.debugMode !== false,
  };
};

export const config = getConfig();
