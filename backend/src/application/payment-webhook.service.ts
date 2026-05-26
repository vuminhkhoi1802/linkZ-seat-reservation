import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { DatabaseService } from '../infrastructure/db/database.service';
import { ReservationService } from './reservation.service';
import { PaymentWebhookDto } from '../interfaces/dto/webhook.dto';
import { IPaymentRepository } from '../domain/repositories';
import { Inject } from '@nestjs/common';

@Injectable()
export class PaymentWebhookService {
  constructor(
    private readonly db: DatabaseService,
    private readonly reservations: ReservationService,
    @Inject('IPaymentRepository')
    private readonly paymentRepo: IPaymentRepository,
  ) {}

  async simulateProviderCompletion(userId: string, paymentAttemptId: string) {
    const payment = await this.paymentRepo.findById(paymentAttemptId);
    if (!payment || payment.user_id !== userId) {
      throw new ForbiddenException('Payment attempt belongs to another user');
    }

    return this.ingestTrustedWebhook({
      providerEventId: `evt_mock_${randomUUID()}`,
      paymentAttemptId,
      type: 'payment.completed',
    });
  }

  async ingestSignedWebhook(body: PaymentWebhookDto, signature: string | undefined) {
    if (!this.isValidSignature(body, signature)) {
      throw new UnauthorizedException('Invalid payment webhook signature');
    }
    return this.ingestTrustedWebhook(body);
  }

  async ingestTrustedWebhook(body: PaymentWebhookDto) {
    const event = await this.db.query<WebhookEventRow>(
      `
        INSERT INTO payment_webhook_events(provider_event_id, payment_attempt_id, payload, status)
        VALUES ($1, $2, $3::jsonb, 'RECEIVED')
        ON CONFLICT (provider_event_id) DO UPDATE
        SET provider_event_id = EXCLUDED.provider_event_id
        RETURNING id, provider_event_id, payment_attempt_id, status, attempts
      `,
      [body.providerEventId, body.paymentAttemptId, JSON.stringify(body)],
    );

    await this.audit(body.paymentAttemptId, 'payment.webhook.received', 'mock-provider', {
      providerEventId: body.providerEventId,
      type: body.type,
    });

    return this.processEvent(event.rows[0].id);
  }

  async retryDueEvents(internalJobToken: string | undefined) {
    if (!process.env.INTERNAL_JOB_TOKEN || internalJobToken !== process.env.INTERNAL_JOB_TOKEN) {
      throw new UnauthorizedException('Invalid internal job token');
    }

    const dueEvents = await this.db.query<{ id: string }>(
      `
        SELECT id
        FROM payment_webhook_events
        WHERE status = 'FAILED'
          AND attempts < 5
          AND (next_retry_at IS NULL OR next_retry_at <= now())
        ORDER BY created_at ASC
        LIMIT 25
      `,
    );

    const results = [];
    for (const event of dueEvents.rows) {
      results.push(await this.processEvent(event.id));
    }
    return { processed: results.length, results };
  }

  private async processEvent(eventId: string) {
    return this.db.transaction(async (manager) => {
      const eventResult = await manager.query(
        `
          SELECT id, provider_event_id, payment_attempt_id, payload, status, attempts
          FROM payment_webhook_events
          WHERE id = $1
          FOR UPDATE
        `,
        [eventId],
      );
      const event = eventResult[0] as WebhookEventRow | undefined;
      if (!event) {
        throw new Error('Webhook event not found');
      }
      if (event.status === 'PROCESSED') {
        return { status: 'PROCESSED', providerEventId: event.provider_event_id };
      }

      try {
        const reservation = await this.reservations.completeProviderPaymentAndReserve(
          event.payment_attempt_id,
          manager,
        );
        await manager.query(
          `
            UPDATE payment_webhook_events
            SET status = 'PROCESSED', processed_at = now(), last_error = NULL, next_retry_at = NULL
            WHERE id = $1
          `,
          [event.id],
        );
        await this.auditWithManager(manager, event.payment_attempt_id, 'payment.webhook.processed', 'worker', {
          providerEventId: event.provider_event_id,
          reservationId: reservation.id,
        });
        return { status: 'PROCESSED', providerEventId: event.provider_event_id, reservation };
      } catch (error) {
        if (error instanceof ConflictException) {
          await manager.query(
            `
              UPDATE payment_webhook_events
              SET status = 'PROCESSED', processed_at = now(), last_error = $2, next_retry_at = NULL
              WHERE id = $1
            `,
            [event.id, error.message],
          );
          await this.auditWithManager(manager, event.payment_attempt_id, 'payment.webhook.conflict', 'worker', {
            providerEventId: event.provider_event_id,
            error: error.message,
          });
          return { status: 'PROCESSED', providerEventId: event.provider_event_id, conflict: error.message };
        }

        const message = error instanceof Error ? error.message : 'Unknown webhook processing failure';
        await manager.query(
          `
            UPDATE payment_webhook_events
            SET status = 'FAILED',
                attempts = attempts + 1,
                last_error = $2,
                next_retry_at = now() + interval '1 minute'
            WHERE id = $1
          `,
          [event.id, message],
        );
        await this.auditWithManager(manager, event.payment_attempt_id, 'payment.webhook.failed', 'worker', {
          providerEventId: event.provider_event_id,
          error: message,
        });
        return { status: 'FAILED', providerEventId: event.provider_event_id, error: message };
      }
    });
  }

  private isValidSignature(body: PaymentWebhookDto, signature: string | undefined): boolean {
    const secret = process.env.MOCK_PAYMENT_WEBHOOK_SECRET;
    if (!secret || !signature) {
      return false;
    }
    const expected = createHmac('sha256', secret)
      .update(this.signaturePayload(body))
      .digest('hex');

    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);
    return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
  }

  private signaturePayload(body: PaymentWebhookDto): string {
    return `${body.providerEventId}:${body.paymentAttemptId}:${body.type}`;
  }

  private audit(paymentAttemptId: string | null, eventType: string, source: string, metadata: Record<string, unknown>) {
    return this.db.query(
      `
        INSERT INTO payment_audit_logs(payment_attempt_id, event_type, source, metadata)
        VALUES ($1, $2, $3, $4::jsonb)
      `,
      [paymentAttemptId, eventType, source, JSON.stringify(metadata)],
    );
  }

  private auditWithManager(
    manager: { query: (query: string, params?: unknown[]) => Promise<unknown> },
    paymentAttemptId: string | null,
    eventType: string,
    source: string,
    metadata: Record<string, unknown>,
  ) {
    return manager.query(
      `
        INSERT INTO payment_audit_logs(payment_attempt_id, event_type, source, metadata)
        VALUES ($1, $2, $3, $4::jsonb)
      `,
      [paymentAttemptId, eventType, source, JSON.stringify(metadata)],
    );
  }
}

interface WebhookEventRow {
  id: string;
  provider_event_id: string;
  payment_attempt_id: string;
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED';
  attempts: number;
}
