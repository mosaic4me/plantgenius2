import Constants from 'expo-constants';

interface AppConfig {
  plantIdApiKey: string;
  plantIdApiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  smtp2goApiKey: string;
  smtp2goApiUrl: string;
  emailFrom: string;
  emailTo: string;
  paystackPublicKey: string;
  sentryDsn: string;
  sentryEnabled: boolean;
  appEnv: 'development' | 'staging' | 'production';
  debugMode: boolean;
}

const getConfig = (): AppConfig => {
  const extra = Constants.expoConfig?.extra || {};

  // Validate required environment variables
  const requiredVars = [
    'plantIdApiKey',
    'supabaseUrl',
    'supabaseAnonKey',
  ];

  const missingVars = requiredVars.filter(key => !extra[key]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please ensure your .env file is properly configured.'
    );
  }

  return {
    plantIdApiKey: extra.plantIdApiKey,
    plantIdApiUrl: extra.plantIdApiUrl || 'https://plant.id/api/v3/identification',
    supabaseUrl: extra.supabaseUrl,
    supabaseAnonKey: extra.supabaseAnonKey,
    smtp2goApiKey: extra.smtp2goApiKey || '',
    smtp2goApiUrl: extra.smtp2goApiUrl || 'https://api.smtp2go.com/v3/email/send',
    emailFrom: extra.emailFrom || '',
    emailTo: extra.emailTo || '',
    paystackPublicKey: extra.paystackPublicKey || '',
    sentryDsn: extra.sentryDsn || '',
    sentryEnabled: extra.sentryEnabled === true || extra.appEnv === 'production',
    appEnv: (extra.appEnv || 'development') as 'development' | 'staging' | 'production',
    debugMode: extra.debugMode !== false,
  };
};

export const config = getConfig();
