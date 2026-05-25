import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReservationService } from '../../application/reservation.service';
import { AuthPrincipal } from '../../domain/types';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuthGuard } from '../guards/auth.guard';

@ApiTags('Reservations')
@Controller('reservations')
@UseGuards(AuthGuard)
@ApiCookieAuth()
export class ReservationsController {
  constructor(private readonly reservations: ReservationService) {}

  @Get('me')
  @ApiOperation({ summary: 'List all confirmed reservations for the current user' })
  @ApiResponse({ status: 200, description: 'Return all user reservations.' })
  me(@CurrentUser() user: AuthPrincipal) {
    return this.reservations.listMyReservations(user.userId);
  }
}
