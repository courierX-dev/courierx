import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hmacSha256 } from '@courierx/shared';

@Injectable()
export class MailgunVerifier {
    constructor(private config: ConfigService) { }

    verifySignature(timestamp: string, token: string, signature: string): boolean {
        const webhookSecret = this.config.get('MAILGUN_WEBHOOK_SECRET');
        if (!webhookSecret) {
            return true; // Skip verification if no secret configured
        }

        const expectedSignature = hmacSha256(`${timestamp}${token}`, webhookSecret);
        return expectedSignature === signature;
    }
}