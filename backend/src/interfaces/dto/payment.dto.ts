import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: '6227b6d0-c34a-4713-862f-abe6ef5032a7' })
  @IsUUID()
  seatId: string;
}
