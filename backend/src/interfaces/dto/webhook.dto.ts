import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID } from 'class-validator';

export class PaymentWebhookDto {
  @ApiProperty({ example: 'evt_mock_123' })
  @IsString()
  providerEventId: string;

  @ApiProperty({ example: 'payment-attempt-uuid' })
  @IsUUID()
  paymentAttemptId: string;

  @ApiProperty({ example: 'payment.completed' })
  @IsIn(['payment.completed'])
  type: 'payment.completed';
}
