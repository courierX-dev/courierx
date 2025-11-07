import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MessageDetail {
  id: string;
  to: string;
  subject: string;
  provider: string | null;
  status: string;
  createdAt: string;
  events: MessageEvent[];
}

export interface MessageEvent {
  id: string;
  event: string;
  provider: string | null;
  timestamp: string;
  metadata?: any;
}

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async getMessageById(messageId: string, productId: string): Promise<MessageDetail> {
    // Fetch message with events
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        productId, // Ensure tenant isolation
      },
      include: {
        events: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    // Determine status based on latest event
    let status = 'sent';
    if (message.events.length > 0) {
      const latestEvent = message.events[message.events.length - 1];
      switch (latestEvent.event) {
        case 'delivered':
        case 'open':
        case 'click':
          status = 'delivered';
          break;
        case 'bounce':
        case 'complaint':
        case 'reject':
          status = 'failed';
          break;
        case 'dropped':
          status = 'dropped';
          break;
        case 'deferred':
          status = 'deferred';
          break;
        case 'queued':
          status = 'queued';
          break;
        default:
          status = 'sent';
      }
    }

    return {
      id: message.id,
      to: message.toEmail,
      subject: message.subject,
      provider: message.providerUsed,
      status,
      createdAt: message.createdAt.toISOString(),
      events: message.events.map((event: any) => ({
        id: event.id.toString(),
        event: event.event,
        provider: event.provider,
        timestamp: event.createdAt.toISOString(),
        metadata: event.metaJson,
      })),
    };
  }
}
