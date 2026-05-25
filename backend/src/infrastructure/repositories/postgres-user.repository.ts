import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { IUserRepository } from '../../domain/repositories';
import { User } from '../db/entities/user.entity';
import { AuthIdentity } from '../db/entities/auth-identity.entity';
import { LocalCredential } from '../db/entities/local-credential.entity';

@Injectable()
export class PostgresUserRepository implements IUserRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<{ id: string; email: string; display_name: string; password_hash: string } | null> {
    const user = await this.userRepo.findOne({
      where: { email },
      relations: { localCredential: true },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      display_name: user.displayName,
      password_hash: user.localCredential?.passwordHash ?? '',
    };
  }

  async findById(id: string): Promise<{ id: string; email: string; display_name: string } | null> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      display_name: user.displayName,
    };
  }

  async createWithCredentials(
    email: string,
    displayName: string,
    passwordHash: string,
  ): Promise<{ id: string; email: string; display_name: string }> {
    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        email,
        displayName,
      });
      const savedUser = await manager.save(User, user);

      const identity = manager.create(AuthIdentity, {
        userId: savedUser.id,
        provider: 'local',
        providerUserId: email,
        email: email,
      });
      await manager.save(AuthIdentity, identity);

      const credentials = manager.create(LocalCredential, {
        userId: savedUser.id,
        passwordHash,
      });
      await manager.save(LocalCredential, credentials);

      return {
        id: savedUser.id,
        email: savedUser.email,
        display_name: savedUser.displayName,
      };
    });
  }
}
