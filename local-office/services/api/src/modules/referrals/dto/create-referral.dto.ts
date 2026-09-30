import { IsOptional, IsString, IsUUID } from 'class-validator';
import type { Prisma } from '@local-office/db';

export class CreateReferralDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsUUID()
  referrerOrgId?: string;

  @IsOptional()
  @IsUUID()
  referrerAdminId?: string;

  @IsOptional()
  @IsUUID()
  referredOrgId?: string;

  @IsOptional()
  metadata?: Record<string, Prisma.InputJsonValue>;
}
