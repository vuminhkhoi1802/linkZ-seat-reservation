import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SeatService } from '../../application/seat.service';
import { AuthGuard } from '../guards/auth.guard';

@ApiTags('Seats')
@Controller('seats')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class SeatsController {
  constructor(private readonly seats: SeatService) {}

  @Get()
  @ApiOperation({ summary: 'List all seats with reservation status' })
  @ApiResponse({ status: 200, description: 'Return all seats.' })
  listSeats() {
    return this.seats.listSeats();
  }
}
