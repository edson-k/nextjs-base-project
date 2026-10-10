import { authenticator } from 'otplib';
import { POST as SETUP } from '@/app/api/auth/two-factor/totp/setup/route';
import { POST as ENABLE } from '@/app/api/auth/two-factor/totp/enable/route';
import { POST as DISABLE } from '@/app/api/auth/two-factor/totp/disable/route';
import User from '@/models/User';
import { symmetricDecrypt } from '@/utils/crypto';
import { sha256 } from '@/utils/security';
import { createUser, createUserWith2FA, json, loginAs, logout, req, PASSWORD } from '../helpers';

const params = { params: {} };

describe('POST /api/auth/two-factor/totp/setup', () => {
  it('401 sem sessão', async () => {
    logout();
    expect((await json(await SETUP(req('POST', { password: PASSWORD }), params))).status).toBe(401);
  });

  it('400 com senha errada', async () => {
    loginAs(await createUser());
    const { status, body } = await json(await SETUP(req('POST', { password: 'errada' }), params));
    expect(status).toBe(400);
    expect(body.error).toBe('incorrect-password');
  });

  it('gera segredo cifrado e guarda só o hash do código de recuperação', async () => {
    const user: any = await createUser();
    loginAs(user);
    const { status, body } = await json(await SETUP(req('POST', { password: PASSWORD }), params));
    expect(status).toBe(200);
    expect(body.recoveryCode).toMatch(/^[A-Z0-9]{12}$/);
    expect(body.dataUri).toMatch(/^data:image\/png/);

    const stored: any = await User.findById(user._id);
    expect(stored.twoFactorEnabled).toBe(false);
    expect(stored.twoFactorSecret).not.toBe(body.secret); // cifrado
    expect(symmetricDecrypt(stored.twoFactorSecret, process.env.ENCRYPTION_KEY!)).toBe(body.secret);
    expect(stored.recoveryCode).toBe(sha256(body.recoveryCode));
    expect(stored.recoveryCode).not.toBe(body.recoveryCode);
  });

  it('400 se o 2FA já está ativo', async () => {
    const { user } = await createUserWith2FA();
    loginAs(user);
    const { status, body } = await json(await SETUP(req('POST', { password: PASSWORD }), params));
    expect(status).toBe(400);
    expect(body.error).toBe('two-factor-already-enabled');
  });
});

describe('POST /api/auth/two-factor/totp/enable', () => {
  const prepare = async () => {
    const user: any = await createUser();
    loginAs(user);
    const setup = await json(await SETUP(req('POST', { password: PASSWORD }), params));
    return { user, secret: setup.body.secret as string };
  };

  it('401 sem sessão', async () => {
    logout();
    expect((await json(await ENABLE(req('POST', { totpCode: '123456' }), params))).status).toBe(401);
  });

  it('400 sem setup prévio', async () => {
    loginAs(await createUser());
    const { status, body } = await json(await ENABLE(req('POST', { totpCode: '123456' }), params));
    expect(status).toBe(400);
    expect(body.error).toBe('two-factor-setup-required');
  });

  it('400 com código errado ou em formato inválido', async () => {
    const { user } = await prepare();
    for (const totpCode of ['000000', 'abcdef', 123456, { $ne: '' }]) {
      const { status } = await json(await ENABLE(req('POST', { totpCode }), params));
      expect(status).toBe(400);
    }
    expect(((await User.findById(user._id)) as any).twoFactorEnabled).toBe(false);
  });

  it('ativa com código TOTP válido', async () => {
    const { user, secret } = await prepare();
    const { status } = await json(await ENABLE(req('POST', { totpCode: authenticator.generate(secret) }), params));
    expect(status).toBe(200);
    expect(((await User.findById(user._id)) as any).twoFactorEnabled).toBe(true);
  });
});

describe('POST /api/auth/two-factor/totp/disable', () => {
  it('401 sem sessão', async () => {
    logout();
    expect((await json(await DISABLE(req('POST', { password: PASSWORD, totpCode: '123456' }), params))).status).toBe(401);
  });

  it('400 sem código ou com código errado', async () => {
    const { user } = await createUserWith2FA();
    loginAs(user);
    const missing = await json(await DISABLE(req('POST', { password: PASSWORD }), params));
    expect(missing.status).toBe(400);
    expect(missing.body.error).toBe('second-factor-required');
    const wrong = await json(await DISABLE(req('POST', { password: PASSWORD, totpCode: '000000' }), params));
    expect(wrong.status).toBe(400);
    expect(((await User.findById(user._id)) as any).twoFactorEnabled).toBe(true);
  });

  it('400 sem senha ou com senha errada, mesmo com TOTP válido', async () => {
    const { user, secret } = await createUserWith2FA();
    loginAs(user);
    const code = authenticator.generate(secret);
    const none = await json(await DISABLE(req('POST', { totpCode: code }), params));
    expect(none.status).toBe(400);
    expect(none.body.error).toBe('incorrect-password');
    const wrong = await json(await DISABLE(req('POST', { password: 'errada', totpCode: code }), params));
    expect(wrong.status).toBe(400);
    expect(wrong.body.error).toBe('incorrect-password');
    expect(((await User.findById(user._id)) as any).twoFactorEnabled).toBe(true);
  });

  it('desativa com TOTP válido e limpa segredo e código de recuperação', async () => {
    const { user, secret } = await createUserWith2FA();
    loginAs(user);
    const { status } = await json(await DISABLE(req('POST', { password: PASSWORD, totpCode: authenticator.generate(secret) }), params));
    expect(status).toBe(200);
    const stored: any = await User.findById(user._id);
    expect(stored.twoFactorEnabled).toBe(false);
    expect(stored.twoFactorSecret).toBeNull();
    expect(stored.recoveryCode).toBeNull();
  });

  it('200 sem alteração quando o 2FA já está desativado', async () => {
    loginAs(await createUser());
    expect((await json(await DISABLE(req('POST', {}), params))).status).toBe(200);
  });
});
