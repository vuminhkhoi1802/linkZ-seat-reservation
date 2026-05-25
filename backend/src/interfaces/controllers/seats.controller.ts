import { Controller, Get } from '@nestjs/common';
import { SeatService } from '../../application/seat.service';

@Controller('seats')
export class SeatsController {
  constructor(private readonly seats: SeatService) {}

  @Get()
  listSeats() {
    return this.seats.listSeats();
  }
}
