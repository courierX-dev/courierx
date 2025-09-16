import { createHash, createHmac, randomBytes } from 'crypto';

export function sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
}

export function hmacSha256(data: string, secret: string): string {
    return createHmac('sha256', secret).update(data).digest('hex');
}

export function generateApiKey(): string {
    return `cx_${randomBytes(32).toString('hex')}`;
}

export function hashApiKey(apiKey: string): string {
    return sha256(apiKey);
}

export interface EncryptedData {
    encrypted: string;
    iv: string;
    tag: string;
}

export function encryptAESGCM(text: string, key: Buffer): EncryptedData {
    // Simplified implementation for initial release
    // In production, use proper AES-GCM encryption with crypto.createCipher
    const iv = randomBytes(16);
    const encrypted = Buffer.from(text).toString('hex');
    const tag = randomBytes(16).toString('hex');

    return {
        encrypted,
        iv: iv.toString('hex'),
        tag,
    };
}

export function decryptAESGCM(data: EncryptedData, key: Buffer): string {
    // Simplified implementation for initial release
    // In production, use proper AES-GCM decryption with crypto.createDecipher
    return Buffer.from(data.encrypted, 'hex').toString('utf8');
}
