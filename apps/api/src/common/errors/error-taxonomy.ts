/**
 * Error taxonomy for CourierX
 * Classifies errors as transient (retriable) or permanent (non-retriable)
 */

export enum ErrorType {
    TRANSIENT = 'transient',
    PERMANENT = 'permanent',
    UNKNOWN = 'unknown'
}

export enum ErrorCategory {
    // Transient errors (should retry)
    RATE_LIMIT = 'rate_limit',
    NETWORK_TIMEOUT = 'network_timeout',
    SERVER_ERROR = 'server_error',
    SERVICE_UNAVAILABLE = 'service_unavailable',

    // Permanent errors (don't retry)
    AUTHENTICATION = 'authentication',
    AUTHORIZATION = 'authorization',
    INVALID_REQUEST = 'invalid_request',
    INVALID_EMAIL = 'invalid_email',
    SUPPRESSED = 'suppressed',
    QUOTA_EXCEEDED = 'quota_exceeded',

    // Unknown/other
    UNKNOWN_ERROR = 'unknown_error'
}

export interface ClassifiedError {
    type: ErrorType;
    category: ErrorCategory;
    message: string;
    originalError: Error;
    retryable: boolean;
    retryAfter?: number; // seconds
    provider?: string;
}

export class ErrorClassifier {
    /**
     * Classify an error from a provider
     */
    static classify(error: Error, provider?: string): ClassifiedError {
        const message = error.message.toLowerCase();

        // SendGrid error patterns
        if (provider === 'sendgrid') {
            return this.classifySendGridError(error, message);
        }

        // Mailgun error patterns
        if (provider === 'mailgun') {
            return this.classifyMailgunError(error, message);
        }

        // SES error patterns
        if (provider === 'ses') {
            return this.classifySESError(error, message);
        }

        // SMTP error patterns
        if (provider === 'smtp') {
            return this.classifySMTPError(error, message);
        }

        // Generic HTTP error patterns
        return this.classifyGenericError(error, message);
    }

    private static classifySendGridError(error: Error, message: string): ClassifiedError {
        // Rate limiting
        if (message.includes('429') || message.includes('rate limit')) {
            return {
                type: ErrorType.TRANSIENT,
                category: ErrorCategory.RATE_LIMIT,
                message: 'SendGrid rate limit exceeded',
                originalError: error,
                retryable: true,
                retryAfter: 60,
                provider: 'sendgrid'
            };
        }

        // Authentication errors
        if (message.includes('401') || message.includes('unauthorized') || message.includes('forbidden')) {
            return {
                type: ErrorType.PERMANENT,
                category: ErrorCategory.AUTHENTICATION,
                message: 'SendGrid authentication failed',
                originalError: error,
                retryable: false,
                provider: 'sendgrid'
            };
        }

        // Bad request
        if (message.includes('400') || message.includes('bad request')) {
            return {
                type: ErrorType.PERMANENT,
                category: ErrorCategory.INVALID_REQUEST,
                message: 'SendGrid rejected request',
                originalError: error,
                retryable: false,
                provider: 'sendgrid'
            };
        }

        // Server errors
        if (message.includes('500') || message.includes('502') || message.includes('503')) {
            return {
                type: ErrorType.TRANSIENT,
                category: ErrorCategory.SERVER_ERROR,
                message: 'SendGrid server error',
                originalError: error,
                retryable: true,
                retryAfter: 30,
                provider: 'sendgrid'
            };
        }

        return this.classifyGenericError(error, message);
    }

    private static classifyMailgunError(error: Error, message: string): ClassifiedError {
        // Rate limiting
        if (message.includes('429') || message.includes('rate limit')) {
            return {
                type: ErrorType.TRANSIENT,
                category: ErrorCategory.RATE_LIMIT,
                message: 'Mailgun rate limit exceeded',
                originalError: error,
                retryable: true,
                retryAfter: 60,
                provider: 'mailgun'
            };
        }

        // Authentication
        if (message.includes('401') || message.includes('unauthorized')) {
            return {
                type: ErrorType.PERMANENT,
                category: ErrorCategory.AUTHENTICATION,
                message: 'Mailgun authentication failed',
                originalError: error,
                retryable: false,
                provider: 'mailgun'
            };
        }

        // Invalid email
        if (message.includes('invalid email') || message.includes('malformed')) {
            return {
                type: ErrorType.PERMANENT,
                category: ErrorCategory.INVALID_EMAIL,
                message: 'Mailgun rejected invalid email',
                originalError: error,
                retryable: false,
                provider: 'mailgun'
            };
        }

        return this.classifyGenericError(error, message);
    }

    private static classifySESError(error: Error, message: string): ClassifiedError {
        // Throttling
        if (message.includes('throttling') || message.includes('rate exceeded')) {
            return {
                type: ErrorType.TRANSIENT,
                category: ErrorCategory.RATE_LIMIT,
                message: 'SES rate limit exceeded',
                originalError: error,
                retryable: true,
                retryAfter: 60,
                provider: 'ses'
            };
        }

        // Quota exceeded
        if (message.includes('quota') || message.includes('limit exceeded')) {
            return {
                type: ErrorType.PERMANENT,
                category: ErrorCategory.QUOTA_EXCEEDED,
                message: 'SES quota exceeded',
                originalError: error,
                retryable: false,
                provider: 'ses'
            };
        }

        // Invalid credentials
        if (message.includes('credentials') || message.includes('access denied')) {
            return {
                type: ErrorType.PERMANENT,
                category: ErrorCategory.AUTHENTICATION,
                message: 'SES authentication failed',
                originalError: error,
                retryable: false,
                provider: 'ses'
            };
        }

        return this.classifyGenericError(error, message);
    }

    private static classifySMTPError(error: Error, message: string): ClassifiedError {
        // Connection timeout
        if (message.includes('timeout') || message.includes('connection')) {
            return {
                type: ErrorType.TRANSIENT,
                category: ErrorCategory.NETWORK_TIMEOUT,
                message: 'SMTP connection timeout',
                originalError: error,
                retryable: true,
                retryAfter: 30,
                provider: 'smtp'
            };
        }

        // Authentication
        if (message.includes('authentication') || message.includes('login')) {
            return {
                type: ErrorType.PERMANENT,
                category: ErrorCategory.AUTHENTICATION,
                message: 'SMTP authentication failed',
                originalError: error,
                retryable: false,
                provider: 'smtp'
            };
        }

        return this.classifyGenericError(error, message);
    }

    private static classifyGenericError(error: Error, message: string): ClassifiedError {
        // Network timeouts
        if (message.includes('timeout') || message.includes('econnreset') || message.includes('enotfound')) {
            return {
                type: ErrorType.TRANSIENT,
                category: ErrorCategory.NETWORK_TIMEOUT,
                message: 'Network timeout or connection error',
                originalError: error,
                retryable: true,
                retryAfter: 30
            };
        }

        // Service unavailable
        if (message.includes('503') || message.includes('service unavailable')) {
            return {
                type: ErrorType.TRANSIENT,
                category: ErrorCategory.SERVICE_UNAVAILABLE,
                message: 'Service temporarily unavailable',
                originalError: error,
                retryable: true,
                retryAfter: 60
            };
        }

        // Default to unknown
        return {
            type: ErrorType.UNKNOWN,
            category: ErrorCategory.UNKNOWN_ERROR,
            message: error.message,
            originalError: error,
            retryable: false
        };
    }

    /**
     * Determine if an error should be retried
     */
    static shouldRetry(classifiedError: ClassifiedError, attemptCount: number = 0): boolean {
        if (!classifiedError.retryable) {
            return false;
        }

        // Max retry attempts based on error type
        const maxRetries = classifiedError.type === ErrorType.TRANSIENT ? 3 : 1;
        return attemptCount < maxRetries;
    }

    /**
     * Calculate retry delay with exponential backoff
     */
    static getRetryDelay(classifiedError: ClassifiedError, attemptCount: number = 0): number {
        const baseDelay = classifiedError.retryAfter || 30;
        const exponentialDelay = baseDelay * Math.pow(2, attemptCount);
        const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd

        return Math.min(exponentialDelay * 1000 + jitter, 300000); // Max 5 minutes
    }
}
