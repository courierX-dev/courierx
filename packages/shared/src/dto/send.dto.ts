import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsArray, ArrayMinSize, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class AttachmentDto {
    @ApiProperty({
        description: 'Filename of the attachment',
        example: 'document.pdf'
    })
    @IsString()
    filename: string;

    @ApiProperty({
        description: 'Base64 encoded content of the attachment',
        example: 'JVBERi0xLjQKJcOkw7zDtsO...'
    })
    @IsString()
    content: string;

    @ApiPropertyOptional({
        description: 'MIME type of the attachment',
        example: 'application/pdf'
    })
    @IsOptional()
    @IsString()
    contentType?: string;
}

export class SendRequestDto {
    @ApiProperty({
        description: 'Recipient email addresses',
        example: ['recipient@example.com'],
        type: [String]
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsEmail({}, { each: true })
    to: string[];

    @ApiProperty({
        description: 'Sender email address',
        example: 'sender@yourdomain.com'
    })
    @IsEmail()
    from: string;

    @ApiPropertyOptional({
        description: 'Reply-to email address',
        example: 'noreply@yourdomain.com'
    })
    @IsOptional()
    @IsEmail()
    replyTo?: string;

    @ApiProperty({
        description: 'Email subject line',
        example: 'Welcome to our service!'
    })
    @IsString()
    subject: string;

    @ApiPropertyOptional({
        description: 'Plain text content of the email',
        example: 'Welcome to our service! We are excited to have you on board.'
    })
    @IsOptional()
    @IsString()
    text?: string;

    @ApiPropertyOptional({
        description: 'HTML content of the email',
        example: '<h1>Welcome!</h1><p>We are excited to have you on board.</p>'
    })
    @IsOptional()
    @IsString()
    html?: string;

    @ApiPropertyOptional({
        description: 'Email attachments',
        type: [AttachmentDto]
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AttachmentDto)
    attachments?: AttachmentDto[];

    @ApiPropertyOptional({
        description: 'Custom headers for the email',
        example: { 'X-Custom-Header': 'value' }
    })
    @IsOptional()
    @IsObject()
    headers?: Record<string, string>;

    @ApiPropertyOptional({
        description: 'Tags for categorizing the email',
        example: ['welcome', 'onboarding'],
        type: [String]
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @ApiPropertyOptional({
        description: 'Custom metadata for the email',
        example: { userId: '12345', campaign: 'welcome-series' }
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class SendResponseDto {
    @ApiProperty({
        description: 'Unique message identifier',
        example: 'msg_1234567890abcdef'
    })
    messageId: string;

    @ApiProperty({
        description: 'Delivery status',
        enum: ['sent', 'failed'],
        example: 'sent'
    })
    status: 'sent' | 'failed';

    @ApiProperty({
        description: 'Provider used for delivery',
        example: 'sendgrid'
    })
    provider: string;

    @ApiProperty({
        description: 'Timestamp of the send attempt',
        example: '2025-09-16T10:30:00.000Z'
    })
    timestamp: string;

    @ApiPropertyOptional({
        description: 'Error message if delivery failed',
        example: 'Email is suppressed due to previous bounce'
    })
    error?: string;

    @ApiPropertyOptional({
        description: 'Provider-specific message ID',
        example: 'sg_1234567890abcdef'
    })
    providerMessageId?: string;
}
