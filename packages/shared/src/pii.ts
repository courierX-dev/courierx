import { sha256 } from './crypto';

export function normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
}

export function hashEmail(email: string): string {
    return sha256(normalizeEmail(email));
}

export function maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
        return `${local[0]}*@${domain}`;
    }
    return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export function extractDomain(email: string): string {
    return email.split('@')[1]?.toLowerCase() || '';
}