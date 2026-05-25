import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Seat } from './seat.entity';

@Entity('payment_attempts')
export class PaymentAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.paymentAttempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'seat_id' })
  seatId: string;

  @ManyToOne(() => Seat, (seat) => seat.paymentAttempts, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'seat_id' })
  seat: Seat;

  @Column()
  status: 'PENDING' | 'COMPLETED' | 'FAILED';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;
}
