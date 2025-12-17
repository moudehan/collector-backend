import { UserRole } from 'src/users/user.entity';

export interface JwtUser {
  sub: string;
  userId: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  username?: string;
}
