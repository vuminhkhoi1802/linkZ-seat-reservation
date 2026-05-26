import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('payment_audit_logs')
export class PaymentAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_attempt_id', type: 'uuid', nullable: true })
  paymentAttemptId: string | null;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column()
  source: string;

  @Column({ type: 'jsonb' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
