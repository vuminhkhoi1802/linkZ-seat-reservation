import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Seat } from './seat.entity';
import { PaymentAttempt } from './payment-attempt.entity';

@Entity('reservations')
@Index('one_confirmed_reservation_per_seat', ['seatId'], {
  unique: true,
  where: "status = 'CONFIRMED'",
})
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.reservations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'seat_id' })
  seatId: string;

  @ManyToOne(() => Seat, (seat) => seat.reservations, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'seat_id' })
  seat: Seat;

  @Column({ name: 'payment_attempt_id', unique: true })
  paymentAttemptId: string;

  @ManyToOne(() => PaymentAttempt, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_attempt_id' })
  paymentAttempt: PaymentAttempt;

  @Column()
  status: 'PENDING_PAYMENT' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';

  @Column({ name: 'confirmed_at', nullable: true })
  confirmedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
