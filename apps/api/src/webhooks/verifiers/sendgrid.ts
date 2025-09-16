import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyHmacSignature } from '../../auth/hmac.util';

@Injectable()
export class SendGridVerifier {
    constructor(private config: ConfigService) { }

    verifySignature(payload: string, signature: string): boolean {
        const webhookSecret = this.config.get('SENDGRID_WEBHOOK_SECRET');
        if (!webhookSecret) {
            return true; // Skip verification if no secret configured
        }

        return verifyHmacSignature(payload, signature, webhookSecret);
    }
}