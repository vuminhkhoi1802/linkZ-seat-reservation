import { Body, Controller, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PaymentService } from '../../application/payment.service';
import { ReservationService } from '../../application/reservation.service';
import { PaymentWebhookService } from '../../application/payment-webhook.service';
import { AuthPrincipal } from '../../domain/types';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CreatePaymentDto } from '../dto/payment.dto';
import { PaymentWebhookDto } from '../dto/webhook.dto';
import { AuthGuard } from '../guards/auth.guard';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentService,
    private readonly reservations: ReservationService,
    private readonly webhooks: PaymentWebhookService,
  ) {}

  @Post('create')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new payment attempt for a seat' })
  @ApiResponse({ status: 201, description: 'Payment attempt created.' })
  @ApiResponse({ status: 400, description: 'Seat is already reserved.' })
  @ApiResponse({ status: 404, description: 'Seat not found.' })
  create(@CurrentUser() user: AuthPrincipal, @Body() body: CreatePaymentDto) {
    return this.payments.createPaymentAttempt(user.userId, body.seatId);
  }

  @Post(':paymentAttemptId/complete')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deprecated direct completion path for compatibility' })
  @ApiResponse({ status: 201, description: 'Payment completed and reservation confirmed.' })
  @ApiResponse({ status: 403, description: 'Payment attempt belongs to another user.' })
  @ApiResponse({ status: 404, description: 'Payment attempt not found.' })
  @ApiResponse({ status: 409, description: 'Seat was reserved by someone else.' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  complete(@CurrentUser() user: AuthPrincipal, @Param('paymentAttemptId') paymentAttemptId: string) {
    return this.reservations.completePaymentAndReserve(user.userId, paymentAttemptId);
  }

  @Post(':paymentAttemptId/mock-provider-complete')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Simulate provider payment completion through webhook processing' })
  mockProviderComplete(
    @CurrentUser() user: AuthPrincipal,
    @Param('paymentAttemptId') paymentAttemptId: string,
  ) {
    return this.webhooks.simulateProviderCompletion(user.userId, paymentAttemptId);
  }

  @Post('webhook')
  @ApiHeader({ name: 'x-mock-signature', required: true })
  @ApiOperation({ summary: 'Receive a signed mock payment provider webhook' })
  webhook(@Body() body: PaymentWebhookDto, @Headers('x-mock-signature') signature?: string) {
    return this.webhooks.ingestSignedWebhook(body, signature);
  }

  @Post('webhook/retry-due')
  @ApiHeader({ name: 'x-internal-job-token', required: true })
  @ApiOperation({ summary: 'Retry failed due payment webhook events' })
  retryDue(@Headers('x-internal-job-token') internalJobToken?: string) {
    return this.webhooks.retryDueEvents(internalJobToken);
  }
}
