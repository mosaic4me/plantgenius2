# Security Documentation

## Environment Variables

This application uses environment variables to manage sensitive configuration. **Never commit `.env` files to version control.**

### Setup Instructions

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual credentials in `.env`

3. Ensure `.env` is listed in `.gitignore` (already configured)

### Required Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PLANT_ID_API_KEY` | Plant.id API key | Yes | `your_api_key_here` |
| `SUPABASE_URL` | Supabase project URL | Yes | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | `eyJ...` |
| `SMTP2GO_API_KEY` | SMTP2GO API key | No | `api-xxx` |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key | No | `pk_test_xxx` |

### Credential Rotation

If any API key is compromised:

1. **Immediately** rotate the key in the service provider dashboard
2. Update `.env` with the new key
3. Restart the development server
4. For production, update environment variables in your hosting platform

### Exposed Credentials (URGENT)

**⚠️ SECURITY ALERT**: The following credentials were previously hardcoded and are now in `.env`. They should be rotated:

1. **Plant.id API Key**: `grGApORUfuHYbsoLTWjZZ06cf1qXDxNzkCwCD7VjKgNt00IILE`
   - Action: Rotate at https://plant.id/api

2. **Supabase Anon Key**: (exposed in git history)
   - Action: Rotate in Supabase dashboard

3. **SMTP2GO API Key**: `api-key-placeholder`
   - Action: Set actual key in `.env`

### Production Deployment

For production environments:

1. **Expo EAS**: Set environment variables in `eas.json`
   ```json
   {
     "build": {
       "production": {
         "env": {
           "PLANT_ID_API_KEY": "production_key_here"
         }
       }
     }
   }
   ```

2. **Vercel/Netlify** (Web): Use platform environment variable settings

3. **Never** use development keys in production

### Security Best Practices

✅ **DO**:
- Use different API keys for development/production
- Rotate keys regularly (every 90 days)
- Monitor API usage for anomalies
- Use environment-specific configurations
- Enable API rate limiting where possible

❌ **DON'T**:
- Commit `.env` files to version control
- Share API keys in chat/email
- Use production keys in development
- Hardcode secrets in source code
- Push debug logs to production

### Reporting Security Issues

If you discover a security vulnerability, please email: security@plantsgenius.com

**Do not** create public GitHub issues for security vulnerabilities.
