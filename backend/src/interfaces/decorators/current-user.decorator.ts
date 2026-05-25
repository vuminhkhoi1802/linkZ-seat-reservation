import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthPrincipal } from '../../domain/types';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ user: AuthPrincipal }>();
  return request.user;
});
