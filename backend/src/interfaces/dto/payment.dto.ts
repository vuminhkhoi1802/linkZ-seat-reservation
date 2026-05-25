import { IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID()
  seatId: string;
}
