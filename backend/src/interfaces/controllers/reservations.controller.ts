import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReservationService } from '../../application/reservation.service';
import { AuthPrincipal } from '../../domain/types';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthGuard } from '../guards/auth.guard';

@Controller('reservations')
@UseGuards(AuthGuard)
export class ReservationsController {
  constructor(private readonly reservations: ReservationService) {}

  @Get('me')
  me(@CurrentUser() user: AuthPrincipal) {
    return this.reservations.getMyReservation(user.userId);
  }
}
