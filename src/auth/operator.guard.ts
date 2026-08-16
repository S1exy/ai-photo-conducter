import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { UserRole, UserStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from './auth-user';

type AuthenticatedRequest = Request & { user?: AuthUser };

@Injectable()
export class OperatorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.userId;
    if (!userId) throw new ForbiddenException('Operator access required');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true },
    });
    if (!user || user.status !== UserStatus.ACTIVE || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      throw new ForbiddenException('Operator access required');
    }
    return true;
  }
}
