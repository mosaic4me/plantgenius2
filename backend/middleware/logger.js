/**
 * Request Logging Middleware
 * Logs all API requests with timestamp, method, URL, and response time
 */

export function requestLogger(req, res, next) {
  const start = Date.now();

  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} ` +
      `${statusColor}${status}\x1b[0m ${duration}ms`
    );
  });

  next();
}

export function errorLogger(error, req, res, next) {
  console.error(`[ERROR] ${new Date().toISOString()}`, {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    body: req.body,
    user: req.userId
  });

  next(error);
}
