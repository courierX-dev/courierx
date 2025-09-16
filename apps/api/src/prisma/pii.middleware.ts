import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';

/**
 * Normalizes and hashes email addresses for PII-aware storage
 */
export function normalizeAndHashEmail(email: string): { norm: string; hash: Buffer } {
    const norm = email.toLowerCase().trim();
    const hash = createHash('sha256').update(norm).digest();
    return { norm, hash };
}

/**
 * Prisma middleware to automatically handle PII fields
 * Automatically populates emailNorm and emailHash fields when email is provided
 */
export function createPIIMiddleware(): Prisma.Middleware {
    return async (params, next) => {
        // Handle User model email fields
        if (params.model === 'User' && (params.action === 'create' || params.action === 'update')) {
            if (params.args.data?.email) {
                const { norm, hash } = normalizeAndHashEmail(params.args.data.email);
                params.args.data.emailNorm = norm;
                params.args.data.emailHash = hash;
            }
        }

        // Handle Message model toEmail fields
        if (params.model === 'Message' && (params.action === 'create' || params.action === 'update')) {
            if (params.args.data?.toEmail) {
                const { norm, hash } = normalizeAndHashEmail(params.args.data.toEmail);
                params.args.data.toNorm = norm;
                params.args.data.toHash = hash;
            }
        }

        // Handle Suppression model email fields
        if (params.model === 'Suppression' && (params.action === 'create' || params.action === 'update')) {
            if (params.args.data?.email) {
                const { norm, hash } = normalizeAndHashEmail(params.args.data.email);
                params.args.data.emailNorm = norm;
                params.args.data.emailHash = hash;
            }
        }

        return next(params);
    };
}
