import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ExternalAuthService } from '../../application/external-auth.service';
import { AuthPrincipal } from '../../domain/types';
import { AuthGuard } from '../guards/auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: ExternalAuthService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Return user profile.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  async me(@CurrentUser() principal: AuthPrincipal) {
    const user = await this.auth.me(principal.userId);
    return { user: user ? this.toUserResponse(user) : null };
  }

  private toUserResponse(user: { id: string; email: string; display_name: string }) {
    return { id: user.id, email: user.email, displayName: user.display_name };
  }
}
