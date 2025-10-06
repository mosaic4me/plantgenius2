import { logger } from '@/utils/logger';

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log debug messages in debug mode', () => {
    logger.debug('Test debug message', { key: 'value' });
    expect(console.log).toHaveBeenCalled();
  });

  it('should log info messages', () => {
    logger.info('Test info message');
    expect(console.info).toHaveBeenCalled();
  });

  it('should log warnings', () => {
    logger.warn('Test warning message');
    expect(console.warn).toHaveBeenCalled();
  });

  it('should log errors with stack traces', () => {
    const error = new Error('Test error');
    logger.error('Test error message', error);
    expect(console.error).toHaveBeenCalled();
  });

  it('should include data in log messages', () => {
    logger.info('Test message', { userId: '123', action: 'login' });
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining('userId'));
  });
});
