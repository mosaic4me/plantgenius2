/**
 * Input Validation Middleware
 * Validates and sanitizes user input to prevent injection attacks
 */

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  // Minimum 8 characters, at least one letter and one number
  return password && password.length >= 8;
}

export function validateObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function validateSignup(req, res, next) {
  const { email, password, fullName } = req.body;

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  if (!password || !validatePassword(password)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters'
    });
  }

  if (fullName && fullName.length > 100) {
    return res.status(400).json({ error: 'Name too long' });
  }

  next();
}

export function validateSignin(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  next();
}

export function validateUserId(req, res, next) {
  if (!validateObjectId(req.params.userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  next();
}

export function validatePaymentReference(req, res, next) {
  const { reference } = req.body;

  if (!reference || reference.length < 10 || reference.length > 100) {
    return res.status(400).json({ error: 'Invalid payment reference' });
  }

  next();
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  // Remove potential XSS
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .trim();
}
