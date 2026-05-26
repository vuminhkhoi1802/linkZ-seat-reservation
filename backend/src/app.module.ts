import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './interfaces/controllers/auth.controller';
import { SeatsController } from './interfaces/controllers/seats.controller';
import { PaymentsController } from './interfaces/controllers/payments.controller';
import { ReservationsController } from './interfaces/controllers/reservations.controller';
import { DatabaseService } from './infrastructure/db/database.service';
import { ExternalAuthService } from './application/external-auth.service';
import { SeatService } from './application/seat.service';
import { PaymentService } from './application/payment.service';
import { ReservationService } from './application/reservation.service';
import { AuthGuard } from './interfaces/guards/auth.guard';
import { TypeOrmSeatRepository } from './infrastructure/repositories/seat.repository';
import { TypeOrmPaymentRepository } from './infrastructure/repositories/payment.repository';
import { TypeOrmReservationRepository } from './infrastructure/repositories/reservation.repository';
import { TypeOrmUserRepository } from './infrastructure/repositories/user.repository';
import { User } from './infrastructure/db/entities/user.entity';
import { AuthIdentity } from './infrastructure/db/entities/auth-identity.entity';
import { Seat } from './infrastructure/db/entities/seat.entity';
import { PaymentAttempt } from './infrastructure/db/entities/payment-attempt.entity';
import { Reservation } from './infrastructure/db/entities/reservation.entity';
import { PaymentWebhookEvent } from './infrastructure/db/entities/payment-webhook-event.entity';
import { PaymentAuditLog } from './infrastructure/db/entities/payment-audit-log.entity';
import { PaymentWebhookService } from './application/payment-webhook.service';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 30,
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false, // We'll keep manual migration/seeding for now via DatabaseService
    }),
    TypeOrmModule.forFeature([
      User,
      AuthIdentity,
      Seat,
      PaymentAttempt,
      Reservation,
      PaymentWebhookEvent,
      PaymentAuditLog,
    ]),
  ],
  controllers: [AuthController, SeatsController, PaymentsController, ReservationsController],
  providers: [
    DatabaseService,
    ExternalAuthService,
    SeatService,
    PaymentService,
    PaymentWebhookService,
    ReservationService,
    AuthGuard,
    {
      provide: 'ISeatRepository',
      useClass: TypeOrmSeatRepository,
    },
    {
      provide: 'IPaymentRepository',
      useClass: TypeOrmPaymentRepository,
    },
    {
      provide: 'IReservationRepository',
      useClass: TypeOrmReservationRepository,
    },
    {
      provide: 'IUserRepository',
      useClass: TypeOrmUserRepository,
    },
  ],
})
export class AppModule {}
