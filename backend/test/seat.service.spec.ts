import { SeatService } from '../src/application/seat.service';

describe('SeatService', () => {
  it('lists seats', async () => {
    const seats = [{ id: '1', label: 'A', isReserved: false }];
    const seatRepo = { findAll: jest.fn().mockResolvedValue(seats) };
    const service = new SeatService(seatRepo as any);

    expect(await service.listSeats()).toEqual(seats);
  });
});
