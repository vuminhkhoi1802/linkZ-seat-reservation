import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SeatService } from '../../application/seat.service';

@ApiTags('Seats')
@Controller('seats')
export class SeatsController {
  constructor(private readonly seats: SeatService) {}

  @Get()
  @ApiOperation({ summary: 'List all seats with reservation status' })
  @ApiResponse({ status: 200, description: 'Return all seats.' })
  listSeats() {
    return this.seats.listSeats();
  }
}
