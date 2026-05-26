import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PaymentWebhookService } from '../src/application/payment-webhook.service';

describe('PaymentWebhookService', () => {
  const webhookBody = {
    providerEventId: 'evt_1',
    paymentAttemptId: 'payment-1',
    type: 'payment.completed',
  } as const;

  let originalEnv: NodeJS.ProcessEnv;
  let db: any;
  let reservations: any;
  let paymentRepo: any;
  let service: PaymentWebhookService;

  beforeEach(() => {
    manager.query.mockClear();
    originalEnv = process.env;
    process.env = { ...originalEnv, MOCK_PAYMENT_WEBHOOK_SECRET: 'secret', INTERNAL_JOB_TOKEN: 'job-token' };
    db = {
      query: jest.fn(),
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    reservations = {
      completeProviderPaymentAndReserve: jest.fn().mockResolvedValue({ id: 'reservation-1' }),
    };
    paymentRepo = {
      findById: jest.fn(),
    };
    service = new PaymentWebhookService(db, reservations, paymentRepo);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const manager = {
    query: jest.fn((query: string) => {
      if (query.includes('SELECT id, provider_event_id')) {
        return Promise.resolve([
          {
            id: 'webhook-1',
            provider_event_id: webhookBody.providerEventId,
            payment_attempt_id: webhookBody.paymentAttemptId,
            status: 'RECEIVED',
            attempts: 0,
          },
        ]);
      }
      return Promise.resolve([]);
    }),
  };

  it('rejects unsigned or incorrectly signed provider webhooks', async () => {
    await expect(service.ingestSignedWebhook(webhookBody as any, 'bad-signature')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('verifies provider signature, stores event, processes reservation, and audits the result', async () => {
    const signature = createHmac('sha256', 'secret')
      .update('evt_1:payment-1:payment.completed')
      .digest('hex');
    db.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'webhook-1',
            provider_event_id: webhookBody.providerEventId,
            payment_attempt_id: webhookBody.paymentAttemptId,
            status: 'RECEIVED',
            attempts: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.ingestSignedWebhook(webhookBody as any, signature);

    expect(result).toMatchObject({ status: 'PROCESSED', reservation: { id: 'reservation-1' } });
    expect(reservations.completeProviderPaymentAndReserve).toHaveBeenCalledWith(webhookBody.paymentAttemptId, manager);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("SET status = 'PROCESSED'"), ['webhook-1']);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('payment_audit_logs'), [
      webhookBody.paymentAttemptId,
      'payment.webhook.processed',
      'worker',
      JSON.stringify({ providerEventId: webhookBody.providerEventId, reservationId: 'reservation-1' }),
    ]);
  });

  it('marks processing failures for retry and records an audit event', async () => {
    reservations.completeProviderPaymentAndReserve.mockRejectedValueOnce(new Error('database timeout'));
    db.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'webhook-1',
            provider_event_id: webhookBody.providerEventId,
            payment_attempt_id: webhookBody.paymentAttemptId,
            status: 'RECEIVED',
            attempts: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.ingestTrustedWebhook(webhookBody as any);

    expect(result).toMatchObject({ status: 'FAILED', error: 'database timeout' });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining("SET status = 'FAILED'"), [
      'webhook-1',
      'database timeout',
    ]);
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('payment_audit_logs'), [
      webhookBody.paymentAttemptId,
      'payment.webhook.failed',
      'worker',
      JSON.stringify({ providerEventId: webhookBody.providerEventId, error: 'database timeout' }),
    ]);
  });

  it('requires the payment attempt to belong to the current user before simulating provider completion', async () => {
    paymentRepo.findById.mockResolvedValue({ id: 'payment-1', user_id: 'other-user' });

    await expect(service.simulateProviderCompletion('user-1', 'payment-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('only retries due failed events when the internal job token is valid', async () => {
    await expect(service.retryDueEvents('wrong-token')).rejects.toBeInstanceOf(UnauthorizedException);

    db.query.mockResolvedValueOnce({ rows: [{ id: 'webhook-1' }] });
    const result = await service.retryDueEvents('job-token');

    expect(result.processed).toBe(1);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("WHERE status = 'FAILED'"));
  });
});
