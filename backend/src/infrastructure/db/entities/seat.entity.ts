import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { PaymentAttempt } from './payment-attempt.entity';
import { Reservation } from './reservation.entity';

@Entity('seats')
export class Seat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  label: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => PaymentAttempt, (attempt) => attempt.seat)
  paymentAttempts: PaymentAttempt[];

  @OneToMany(() => Reservation, (reservation) => reservation.seat)
  reservations: Reservation[];
}
