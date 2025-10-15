/**
 * Email Service
 * Sends emails via SMTP2GO for password reset and notifications
 */

import dotenv from 'dotenv';
dotenv.config();

const SMTP2GO_API_URL = 'https://api.smtp2go.com/v3/email/send';
const SMTP2GO_API_KEY = process.env.SMTP2GO_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@plantsgenius.app';

export async function sendPasswordResetEmail(email, resetToken) {
  try {
    const resetUrl = `plantsgenius://reset-password?token=${resetToken}`;

    const emailData = {
      api_key: SMTP2GO_API_KEY,
      to: [email],
      sender: EMAIL_FROM,
      subject: 'PlantGenius - Password Reset Request',
      text_body: `
You requested to reset your password for PlantGenius.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
PlantGenius Team
      `.trim(),
      html_body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #4CAF50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      margin: 20px 0;
    }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Password Reset Request</h2>
    <p>You requested to reset your password for PlantGenius.</p>
    <p>Click the button below to reset your password:</p>
    <a href="${resetUrl}" class="button">Reset Password</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <div class="footer">
      <p>Best regards,<br>PlantGenius Team</p>
    </div>
  </div>
</body>
</html>
      `.trim()
    };

    const response = await fetch(SMTP2GO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();

    if (!response.ok || result.data?.error) {
      throw new Error(result.data?.error || 'Failed to send email');
    }

    console.log('✅ Password reset email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw error;
  }
}

export async function sendWelcomeEmail(email, fullName) {
  try {
    const emailData = {
      api_key: SMTP2GO_API_KEY,
      to: [email],
      sender: EMAIL_FROM,
      subject: 'Welcome to PlantGenius! 🌱',
      text_body: `
Hi ${fullName || 'there'}!

Welcome to PlantGenius - your personal plant identification and care assistant!

With PlantGenius, you can:
- Identify plants instantly using your phone camera
- Get detailed plant care information
- Track your plant collection
- Set watering reminders
- Access a comprehensive plant database

Start exploring by taking a photo of any plant!

Best regards,
PlantGenius Team
      `.trim(),
      html_body: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .feature { margin: 15px 0; padding-left: 25px; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌱 Welcome to PlantGenius!</h1>
    </div>
    <p>Hi ${fullName || 'there'}!</p>
    <p>Welcome to PlantGenius - your personal plant identification and care assistant!</p>
    <p><strong>With PlantGenius, you can:</strong></p>
    <div class="feature">📸 Identify plants instantly using your phone camera</div>
    <div class="feature">📚 Get detailed plant care information</div>
    <div class="feature">🌿 Track your plant collection</div>
    <div class="feature">💧 Set watering reminders</div>
    <div class="feature">🔍 Access a comprehensive plant database</div>
    <p style="margin-top: 30px;">Start exploring by taking a photo of any plant!</p>
    <div class="footer">
      <p>Best regards,<br>PlantGenius Team</p>
    </div>
  </div>
</body>
</html>
      `.trim()
    };

    const response = await fetch(SMTP2GO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();

    if (!response.ok || result.data?.error) {
      console.warn('Failed to send welcome email:', result.data?.error);
      return { success: false };
    }

    console.log('✅ Welcome email sent to:', email);
    return { success: true };
  } catch (error) {
    console.warn('Email send warning (non-critical):', error.message);
    return { success: false };
  }
}
