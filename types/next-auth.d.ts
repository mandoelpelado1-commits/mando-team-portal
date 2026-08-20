import { Role } from '@/lib/db';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
      mustChangePassword: boolean;
      totpEnabled: boolean;
      avatarUrl?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    username: string;
    role: Role;
    mustChangePassword: boolean;
    totpEnabled: boolean;
    avatarUrl?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: Role;
    mustChangePassword: boolean;
    totpEnabled: boolean;
    avatarUrl?: string | null;
  }
}
