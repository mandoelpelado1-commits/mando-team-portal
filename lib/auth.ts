import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import * as OTPAuth from 'otpauth';
import { getUserByUsername, getUserById } from './db';

export const authOptions: AuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        totpCode: { label: '2FA code', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await getUserByUsername(credentials.username.toLowerCase());
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;
        if (user.active === false) throw new Error('ACCOUNT_DISABLED');

        if (user.totp_enabled && user.totp_secret) {
          if (!credentials.totpCode) throw new Error('2FA_REQUIRED');
          const totp = new OTPAuth.TOTP({ algorithm: 'SHA1', digits: 6, period: 30, secret: user.totp_secret });
          const delta = totp.validate({ token: credentials.totpCode.trim(), window: 1 });
          if (delta === null) throw new Error('2FA_INVALID');
        }

        return {
          id: String(user.id),
          name: user.display_name,
          username: user.username,
          role: user.role,
          mustChangePassword: user.must_change_password === 1,
          totpEnabled: user.totp_enabled === true,
          avatarUrl: user.avatar_url,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = (user as any).id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.mustChangePassword = (user as any).mustChangePassword;
        token.totpEnabled = (user as any).totpEnabled;
        token.avatarUrl = (user as any).avatarUrl;
      }
      if (trigger === 'update') {
        const fresh = await getUserById(Number(token.id));
        if (fresh) {
          token.mustChangePassword = fresh.must_change_password === 1;
          token.totpEnabled = fresh.totp_enabled === true;
          token.avatarUrl = fresh.avatar_url;
          token.name = fresh.display_name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).role = token.role;
        (session.user as any).mustChangePassword = token.mustChangePassword;
        (session.user as any).totpEnabled = token.totpEnabled;
        (session.user as any).avatarUrl = token.avatarUrl;
        session.user.name = token.name;
      }
      return session;
    },
  },
};
