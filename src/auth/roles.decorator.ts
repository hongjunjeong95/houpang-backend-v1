import { SetMetadata } from '@nestjs/common';

import { UserRole } from '@apis/users/entities/user.entity';

export type AllowedRoles = keyof typeof UserRole | 'Any';

export const Roles = (roles: AllowedRoles[]) => SetMetadata('roles', roles);
