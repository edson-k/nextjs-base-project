import { authenticator } from 'otplib';
import { authOptions } from '@/app/api/auth/[...nextauth]';
import User from '@/models/User';
import Token from '@/models/Token';
import { createToken } from '@/utils/tokens';
import { createUser, createUserWith2FA, mailer, setIp, PASSWORD } from '../helpers';

const authorize = (credentials: Record<string, unknown>) =>
  (authOptions.providers[0] as any).options.authorize({ token: 'ok', ...credentials });

const base = { email: 'teste@example.com', password: PASSWORD };

describe('rota /api/auth/[...nextauth]', () => {
  it('exporta GET e POST criados com authOptions', async () => {
    const handler = jest.fn();
    const NextAuth = jest.fn(() => handler);
    jest.resetModules();
    jest.doMock('next-auth', () => ({ __esModule: true, default: NextAuth }));
    const route = await import('@/app/api/auth/[...nextauth]/route');
    expect(NextAuth).toHaveBeenCalledTimes(1);
    expect((NextAuth.mock.calls[0] as any[])[0]).toHaveProperty('providers');
    expect(route.GET).toBe(handler);
    expect(route.POST).toBe(handler);
  });
});

describe('authorize (login por credenciais)', () => {
  beforeEach(() => setIp('10.0.0.1'));

  it('login ok devolve o usuário e atualiza lastIp', async () => {
    const user: any = await createUser({ lastIp: '10.0.0.1' });
    const result = await authorize(base);
    expect(result).toMatchObject({ id: String(user._id), email: 'teste@example.com', sessionVersion: 0 });
    expect(((await User.findById(user._id)) as any).lastConnection).toBeTruthy();
  });

  it('e-mail é normalizado (maiúsculas e espaços)', async () => {
    await createUser();
    expect(await authorize({ ...base, email: '  TESTE@Example.com ' })).toBeTruthy();
  });

  it('usuário inexistente e senha errada devolvem null', async () => {
    await createUser();
    expect(await authorize({ ...base, email: 'ninguem@example.com' })).toBeNull();
    expect(await authorize({ ...base, password: 'errada-errada' })).toBeNull();
  });

  it('senha ou e-mail como objeto (NoSQL injection) devolvem null', async () => {
    await createUser();
    expect(await authorize({ ...base, password: { $ne: '' } })).toBeNull();
    expect(await authorize({ ...base, email: { $ne: '' } })).toBeNull();
  });

  it('reCAPTCHA inválido lança is-bot', async () => {
    await createUser();
    await expect(authorize({ ...base, token: 'bot' })).rejects.toThrow('is-bot');
  });

  it('conta inativa lança user-not-active', async () => {
    await createUser({ active: false });
    await expect(authorize(base)).rejects.toThrow('user-not-active');
  });

  it('bloqueia por força bruta: too-many-requests após 10 tentativas por e-mail', async () => {
    await createUser();
    for (let i = 0; i < 10; i++) expect(await authorize({ ...base, password: 'errada-errada' })).toBeNull();
    await expect(authorize(base)).rejects.toThrow('too-many-requests');
  });

  describe('IP novo (OTP por e-mail)', () => {
    it('primeiro passo envia o código e lança otp-request', async () => {
      await createUser({ lastIp: '1.1.1.1' });
      await expect(authorize(base)).rejects.toThrow('otp-request');
      expect(mailer()).toHaveBeenCalledTimes(1);
      const token: any = await Token.findOne({ type: 'otp' });
      expect(token.token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('step otp sem código lança otp-required; código errado lança incorrect-otp-code', async () => {
      await createUser({ lastIp: '1.1.1.1' });
      await expect(authorize({ ...base, step: 'otp' })).rejects.toThrow('otp-required');
      await expect(authorize({ ...base, step: 'otp', otpCode: 'ZZZZZZZZ' })).rejects.toThrow('incorrect-otp-code');
    });

    it('código correto autentica uma única vez', async () => {
      const user: any = await createUser({ lastIp: '1.1.1.1' });
      await createToken(user._id, 'otp', 'ABCD2345');
      expect(await authorize({ ...base, step: 'otp', otpCode: 'abcd2345' })).toBeTruthy();
      expect(((await User.findById(user._id)) as any).lastIp).toBe('10.0.0.1');
      // o código foi consumido
      await User.updateOne({ _id: user._id }, { lastIp: '1.1.1.1' });
      await expect(authorize({ ...base, step: 'otp', otpCode: 'ABCD2345' })).rejects.toThrow('incorrect-otp-code');
    });

    it('OTP expirado (> 5 min) é recusado', async () => {
      const user: any = await createUser({ lastIp: '1.1.1.1' });
      await createToken(user._id, 'otp', 'ABCD2345');
      await Token.updateOne({ userId: user._id }, { createdAt: new Date(Date.now() - 6 * 60_000) });
      await expect(authorize({ ...base, step: 'otp', otpCode: 'ABCD2345' })).rejects.toThrow('incorrect-otp-code');
    });

    it('limita tentativas de OTP (5 por 5 min)', async () => {
      await createUser({ lastIp: '1.1.1.1' });
      for (let i = 0; i < 5; i++) {
        await expect(authorize({ ...base, step: 'otp', otpCode: 'ZZZZZZZZ' })).rejects.toThrow('incorrect-otp-code');
      }
      await expect(authorize({ ...base, step: 'otp', otpCode: 'ZZZZZZZZ' })).rejects.toThrow('too-many-requests');
    });
  });

  describe('2FA (TOTP)', () => {
    it('sem step ou com step diferente não autentica (deny by default)', async () => {
      await createUserWith2FA({ lastIp: '1.1.1.1' });
      await expect(authorize(base)).rejects.toThrow('second-factor-request');
      await expect(authorize({ ...base, step: 'otp', otpCode: 'ABCD2345' })).rejects.toThrow('second-factor-request');
      await expect(authorize({ ...base, step: 'qualquer' })).rejects.toThrow('second-factor-request');
    });

    it('step 2fa sem código lança second-factor-required; código inválido lança incorrect-two-factor-code', async () => {
      await createUserWith2FA();
      await expect(authorize({ ...base, step: '2fa' })).rejects.toThrow('second-factor-required');
      await expect(authorize({ ...base, step: '2fa', totpCode: '000000' })).rejects.toThrow('incorrect-two-factor-code');
      await expect(authorize({ ...base, step: '2fa', totpCode: { $ne: '' } })).rejects.toThrow('second-factor-required');
    });

    it('TOTP válido autentica e o mesmo código não pode ser reutilizado (replay)', async () => {
      const { secret } = await createUserWith2FA();
      const code = authenticator.generate(secret);
      expect(await authorize({ ...base, step: '2fa', totpCode: code })).toBeTruthy();
      await expect(authorize({ ...base, step: '2fa', totpCode: code })).rejects.toThrow('incorrect-two-factor-code');
    });
  });

  describe('código de recuperação', () => {
    it('autentica uma vez, desativa o 2FA e revoga sessões antigas', async () => {
      const { user, recoveryCode } = await createUserWith2FA();
      const result = await authorize({ ...base, step: 'recoveryCode', recoveryCode: recoveryCode.toLowerCase() });
      expect(result).toMatchObject({ sessionVersion: 1 });

      const stored: any = await User.findById(user._id);
      expect(stored.twoFactorEnabled).toBe(false);
      expect(stored.twoFactorSecret).toBeNull();
      expect(stored.recoveryCode).toBeNull();
      expect(stored.sessionVersion).toBe(1);
    });

    it('código errado, vazio ou o próprio hash armazenado são recusados', async () => {
      const { user } = await createUserWith2FA();
      await expect(authorize({ ...base, step: 'recoveryCode' })).rejects.toThrow('recovery-code-required');
      await expect(authorize({ ...base, step: 'recoveryCode', recoveryCode: 'ERRADO' })).rejects.toThrow('incorrect-recovery-code');
      const stored: any = await User.findById(user._id);
      await expect(authorize({ ...base, step: 'recoveryCode', recoveryCode: stored.recoveryCode })).rejects.toThrow('incorrect-recovery-code');
    });
  });
});

describe('callbacks do NextAuth', () => {
  it('jwt guarda o sessionVersion e session o expõe como sv', async () => {
    const token = await (authOptions.callbacks as any).jwt({ token: {}, user: { sessionVersion: 3 } });
    expect(token.sv).toBe(3);
    const session = await (authOptions.callbacks as any).session({ session: {}, token });
    expect(session.sv).toBe(3);
  });

  it('exige NEXTAUTH_SECRET e sessão JWT de 7 dias', () => {
    expect(authOptions.secret).toBe(process.env.NEXTAUTH_SECRET);
    expect(authOptions.session).toMatchObject({ strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 });
  });
});
