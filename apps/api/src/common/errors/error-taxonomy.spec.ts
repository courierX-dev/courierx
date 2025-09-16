import { ErrorClassifier, ErrorType, ErrorCategory } from './error-taxonomy';

describe('ErrorClassifier', () => {
    describe('SendGrid errors', () => {
        it('should classify rate limit errors as transient', () => {
            const error = new Error('SendGrid API error: 429 Too Many Requests');
            const classified = ErrorClassifier.classify(error, 'sendgrid');

            expect(classified.type).toBe(ErrorType.TRANSIENT);
            expect(classified.category).toBe(ErrorCategory.RATE_LIMIT);
            expect(classified.retryable).toBe(true);
            expect(classified.retryAfter).toBe(60);
        });

        it('should classify auth errors as permanent', () => {
            const error = new Error('SendGrid API error: 401 Unauthorized');
            const classified = ErrorClassifier.classify(error, 'sendgrid');

            expect(classified.type).toBe(ErrorType.PERMANENT);
            expect(classified.category).toBe(ErrorCategory.AUTHENTICATION);
            expect(classified.retryable).toBe(false);
        });

        it('should classify server errors as transient', () => {
            const error = new Error('SendGrid API error: 500 Internal Server Error');
            const classified = ErrorClassifier.classify(error, 'sendgrid');

            expect(classified.type).toBe(ErrorType.TRANSIENT);
            expect(classified.category).toBe(ErrorCategory.SERVER_ERROR);
            expect(classified.retryable).toBe(true);
        });
    });

    describe('Mailgun errors', () => {
        it('should classify invalid email as permanent', () => {
            const error = new Error('Mailgun error: invalid email address');
            const classified = ErrorClassifier.classify(error, 'mailgun');

            expect(classified.type).toBe(ErrorType.PERMANENT);
            expect(classified.category).toBe(ErrorCategory.INVALID_EMAIL);
            expect(classified.retryable).toBe(false);
        });
    });

    describe('Generic errors', () => {
        it('should classify network timeouts as transient', () => {
            const error = new Error('ECONNRESET: Connection reset by peer');
            const classified = ErrorClassifier.classify(error);

            expect(classified.type).toBe(ErrorType.TRANSIENT);
            expect(classified.category).toBe(ErrorCategory.NETWORK_TIMEOUT);
            expect(classified.retryable).toBe(true);
        });

        it('should classify unknown errors as unknown', () => {
            const error = new Error('Some random error');
            const classified = ErrorClassifier.classify(error);

            expect(classified.type).toBe(ErrorType.UNKNOWN);
            expect(classified.category).toBe(ErrorCategory.UNKNOWN_ERROR);
            expect(classified.retryable).toBe(false);
        });
    });

    describe('Retry logic', () => {
        it('should allow retries for transient errors within limit', () => {
            const error = new Error('Rate limit exceeded');
            const classified = ErrorClassifier.classify(error, 'sendgrid');

            expect(ErrorClassifier.shouldRetry(classified, 0)).toBe(true);
            expect(ErrorClassifier.shouldRetry(classified, 2)).toBe(true);
            expect(ErrorClassifier.shouldRetry(classified, 3)).toBe(false);
        });

        it('should not allow retries for permanent errors', () => {
            const error = new Error('401 Unauthorized');
            const classified = ErrorClassifier.classify(error, 'sendgrid');

            expect(ErrorClassifier.shouldRetry(classified, 0)).toBe(false);
        });

        it('should calculate exponential backoff delay', () => {
            const error = new Error('Rate limit exceeded');
            const classified = ErrorClassifier.classify(error, 'sendgrid');

            const delay1 = ErrorClassifier.getRetryDelay(classified, 0);
            const delay2 = ErrorClassifier.getRetryDelay(classified, 1);
            const delay3 = ErrorClassifier.getRetryDelay(classified, 2);

            expect(delay2).toBeGreaterThan(delay1);
            expect(delay3).toBeGreaterThan(delay2);
            expect(delay3).toBeLessThanOrEqual(300000); // Max 5 minutes
        });
    });
});
