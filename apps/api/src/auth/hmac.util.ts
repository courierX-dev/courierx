import { hmacSha256 } from '@courierx/shared';

export function verifyHmacSignature(
    payload: string,
    signature: string,
    secret: string
): boolean {
    const expectedSignature = hmacSha256(payload, secret);

    // Remove 'sha256=' prefix if present
    const cleanSignature = signature.replace(/^sha256=/, '');

    return expectedSignature === cleanSignature;
}

export function generateHmacSignature(payload: string, secret: string): string {
    return `sha256=${hmacSha256(payload, secret)}`;
}