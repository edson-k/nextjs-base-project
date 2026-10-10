import { NextRequest } from 'next/server';
import { authenticator } from 'otplib';
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import User from '@/models/User';
import { hashPassword } from '@/utils/hash';
import { symmetricEncrypt } from '@/utils/crypto';
import { transporter } from '@/utils/nodemailer';
import { sha256 } from '@/utils/security';

export const PASSWORD = 'Senha12345!';
let passwordHash: string | undefined;

export const req = (method: string, body?: unknown, raw?: string) =>
  new NextRequest('http://localhost/api/test', {
    method,
    headers: { 'content-type': 'application/json' },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });

export const setIp = (ip: string) => {
  (headers as jest.Mock).mockImplementation(async () => new Headers({ 'x-real-ip': ip }));
};

export const mailer = () => transporter.sendMail as jest.Mock;

export const loginAs = (user: any) =>
  (getServerSession as jest.Mock).mockResolvedValue({
    user: { name: user.name, email: user.email },
    sv: user.sessionVersion ?? 0,
    expires: new Date(Date.now() + 3600_000).toISOString(),
  });

export const logout = () => (getServerSession as jest.Mock).mockResolvedValue(null);

/** Cria um usuário ativo, com lastIp = 10.0.0.1 (o IP padrão dos testes), sem precisar de OTP. */
export const createUser = async (overrides: Record<string, unknown> = {}) => {
  passwordHash = passwordHash || (await hashPassword(PASSWORD));
  return User.create({
    name: 'Teste',
    email: 'teste@example.com',
    password: passwordHash,
    active: true,
    lastIp: '10.0.0.1',
    ...overrides,
  });
};

/** Usuário com 2FA ativo; devolve também o segredo TOTP e o código de recuperação em texto puro. */
export const createUserWith2FA = async (overrides: Record<string, unknown> = {}) => {
  const secret = authenticator.generateSecret(20);
  const recoveryCode = 'ABCDEFGH2345';
  const user = await createUser({
    twoFactorEnabled: true,
    twoFactorSecret: symmetricEncrypt(secret, process.env.ENCRYPTION_KEY!),
    recoveryCode: sha256(recoveryCode),
    ...overrides,
  });
  return { user, secret, recoveryCode };
};

export const json = async (res: Response) => ({ status: res.status, body: await res.json() });
