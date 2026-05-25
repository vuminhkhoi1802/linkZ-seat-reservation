import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentService } from '../../application/payment.service';
import { ReservationService } from '../../application/reservation.service';
import { AuthPrincipal } from '../../domain/types';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CreatePaymentDto } from '../dto/payment.dto';
import { AuthGuard } from '../guards/auth.guard';

@Controller('payments')
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(
    private readonly payments: PaymentService,
    private readonly reservations: ReservationService,
  ) {}

  @Post('create')
  create(@CurrentUser() user: AuthPrincipal, @Body() body: CreatePaymentDto) {
    return this.payments.createPaymentAttempt(user.userId, body.seatId);
  }

  @Post(':paymentAttemptId/complete')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  complete(@CurrentUser() user: AuthPrincipal, @Param('paymentAttemptId') paymentAttemptId: string) {
    return this.reservations.completePaymentAndReserve(user.userId, paymentAttemptId);
  }
}
