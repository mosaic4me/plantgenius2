import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { config } from '@/utils/config';
import { logger } from '@/utils/logger';

export const sendEmailProcedure = publicProcedure
    .input(
        z.object({
            subject: z.string().min(1),
            message: z.string().min(1),
            senderEmail: z.string().email().optional(),
        })
    )
    .mutation(async ({ input }) => {
        try {
            if (!config.smtp2goApiKey) {
                throw new Error('Email service not configured. Please contact support.');
            }

            const response = await fetch(config.smtp2goApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api_key: config.smtp2goApiKey,
                    to: [config.emailTo || 'support@plantsgenius.com'],
                    sender: config.emailFrom || 'noreply@plantsgenius.com',
                    subject: `PlantsGenius Contact: ${input.subject}`,
                    text_body: `From: ${input.senderEmail || 'Anonymous'}\n\n${input.message}`,
                    html_body: `<p><strong>From:</strong> ${input.senderEmail || 'Anonymous'}</p><p>${input.message.replace(/\n/g, '<br>')}</p>`,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send email');
            }

            return { success: true, message: 'Email sent successfully' };
        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            const errorMessage = err.message || 'Failed to send email';

            logger.error('Error sending email', err, {
                subject: input.subject,
                senderEmail: input.senderEmail,
            });

            throw new Error(errorMessage);
        }
    });
