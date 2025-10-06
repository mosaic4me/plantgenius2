import { config } from '@/utils/config';

describe('Configuration', () => {
  it('should load all required environment variables', () => {
    expect(config.plantIdApiKey).toBeDefined();
    expect(config.supabaseUrl).toBeDefined();
    expect(config.supabaseAnonKey).toBeDefined();
  });

  it('should have correct API URLs', () => {
    expect(config.plantIdApiUrl).toContain('api');
    expect(config.supabaseUrl).toContain('supabase');
  });

  it('should have app environment set', () => {
    expect(['development', 'staging', 'production', 'test']).toContain(config.appEnv);
  });

  it('should have debug mode set for test environment', () => {
    expect(config.debugMode).toBe(true);
  });
});
