import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './interfaces/controllers/auth.controller';
import { SeatsController } from './interfaces/controllers/seats.controller';
import { PaymentsController } from './interfaces/controllers/payments.controller';
import { ReservationsController } from './interfaces/controllers/reservations.controller';
import { DatabaseService } from './infrastructure/db/database.service';
import { PasswordHasher } from './infrastructure/security/password-hasher';
import { SessionService } from './infrastructure/security/session.service';
import { LocalAuthService } from './application/local-auth.service';
import { SeatService } from './application/seat.service';
import { PaymentService } from './application/payment.service';
import { ReservationService } from './application/reservation.service';
import { AuthGuard } from './interfaces/guards/auth.guard';
import { PostgresSeatRepository } from './infrastructure/repositories/postgres-seat.repository';
import { PostgresPaymentRepository } from './infrastructure/repositories/postgres-payment.repository';
import { PostgresReservationRepository } from './infrastructure/repositories/postgres-reservation.repository';
import { PostgresUserRepository } from './infrastructure/repositories/postgres-user.repository';
import { User } from './infrastructure/db/entities/user.entity';
import { AuthIdentity } from './infrastructure/db/entities/auth-identity.entity';
import { LocalCredential } from './infrastructure/db/entities/local-credential.entity';
import { Session } from './infrastructure/db/entities/session.entity';
import { Seat } from './infrastructure/db/entities/seat.entity';
import { PaymentAttempt } from './infrastructure/db/entities/payment-attempt.entity';
import { Reservation } from './infrastructure/db/entities/reservation.entity';

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
      LocalCredential,
      Session,
      Seat,
      PaymentAttempt,
      Reservation,
    ]),
  ],
  controllers: [AuthController, SeatsController, PaymentsController, ReservationsController],
  providers: [
    DatabaseService,
    PasswordHasher,
    SessionService,
    LocalAuthService,
    SeatService,
    PaymentService,
    ReservationService,
    AuthGuard,
    {
      provide: 'ISeatRepository',
      useClass: PostgresSeatRepository,
    },
    {
      provide: 'IPaymentRepository',
      useClass: PostgresPaymentRepository,
    },
    {
      provide: 'IReservationRepository',
      useClass: PostgresReservationRepository,
    },
    {
      provide: 'IUserRepository',
      useClass: PostgresUserRepository,
    },
  ],
})
export class AppModule {}
