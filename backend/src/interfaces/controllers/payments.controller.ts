import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PaymentService } from '../../application/payment.service';
import { ReservationService } from '../../application/reservation.service';
import { AuthPrincipal } from '../../domain/types';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CreatePaymentDto } from '../dto/payment.dto';
import { AuthGuard } from '../guards/auth.guard';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(AuthGuard)
@ApiCookieAuth()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentService,
    private readonly reservations: ReservationService,
  ) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new payment attempt for a seat' })
  @ApiResponse({ status: 201, description: 'Payment attempt created.' })
  @ApiResponse({ status: 400, description: 'Seat is already reserved.' })
  @ApiResponse({ status: 404, description: 'Seat not found.' })
  create(@CurrentUser() user: AuthPrincipal, @Body() body: CreatePaymentDto) {
    return this.payments.createPaymentAttempt(user.userId, body.seatId);
  }

  @Post(':paymentAttemptId/complete')
  @ApiOperation({ summary: 'Complete a payment attempt and confirm reservation' })
  @ApiResponse({ status: 201, description: 'Payment completed and reservation confirmed.' })
  @ApiResponse({ status: 403, description: 'Payment attempt belongs to another user.' })
  @ApiResponse({ status: 404, description: 'Payment attempt not found.' })
  @ApiResponse({ status: 409, description: 'Seat was reserved by someone else.' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  complete(@CurrentUser() user: AuthPrincipal, @Param('paymentAttemptId') paymentAttemptId: string) {
    return this.reservations.completePaymentAndReserve(user.userId, paymentAttemptId);
  }
}
