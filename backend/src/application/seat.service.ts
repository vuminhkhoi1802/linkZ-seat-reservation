import { Inject, Injectable } from '@nestjs/common';
import { SeatView } from '../domain/types';
import { ISeatRepository } from '../domain/repositories';

@Injectable()
export class SeatService {
  constructor(
    @Inject('ISeatRepository')
    private readonly seatRepo: ISeatRepository,
  ) {}

  async listSeats(): Promise<SeatView[]> {
    return this.seatRepo.findAll();
  }
}
