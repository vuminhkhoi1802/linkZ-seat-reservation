import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { IUserRepository } from '../../domain/repositories';
import { User } from '../db/entities/user.entity';
import { AuthIdentity } from '../db/entities/auth-identity.entity';

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<{ id: string; email: string; display_name: string } | null> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      display_name: user.displayName,
    };
  }

  async upsertExternalIdentity(
    provider: string,
    providerUserId: string,
    email: string,
    displayName: string,
  ): Promise<{ id: string; email: string; display_name: string }> {
    return this.dataSource.transaction(async (manager) => {
      const identityRepo = manager.getRepository(AuthIdentity);
      const existingIdentity = await identityRepo.findOne({
        where: { provider, providerUserId },
        relations: { user: true },
      });

      if (existingIdentity) {
        existingIdentity.email = email;
        existingIdentity.user.email = email;
        existingIdentity.user.displayName = displayName;
        const savedUser = await manager.save(User, existingIdentity.user);
        await identityRepo.save(existingIdentity);
        return this.toUserResponse(savedUser);
      }

      let user = await manager.findOne(User, { where: { email } });
      if (!user) {
        user = manager.create(User, { email, displayName });
        user = await manager.save(User, user);
      }

      const identity = identityRepo.create({
        userId: user.id,
        provider,
        providerUserId,
        email,
      });
      await identityRepo.save(identity);

      return this.toUserResponse(user);
    });
  }

  private toUserResponse(user: User): { id: string; email: string; display_name: string } {
    return {
      id: user.id,
      email: user.email,
      display_name: user.displayName,
    };
  }
}
