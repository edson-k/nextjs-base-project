import { POST, PUT } from '@/app/api/account/reset-password/route';
import User from '@/models/User';
import Token from '@/models/Token';
import { createToken } from '@/utils/tokens';
import { isPasswordValid } from '@/utils/hash';
import { createUser, json, mailer, req, setIp, PASSWORD } from '../helpers';

describe('POST /api/account/reset-password (pedir link)', () => {
  beforeEach(() => setIp('10.0.0.1'));

  it('conta ativa: cria token com hash e envia e-mail', async () => {
    await createUser();
    const { status } = await json(await POST(req('POST', { email: 'Teste@Example.com', token: 'ok' })));
    expect(status).toBe(200);
    expect(mailer()).toHaveBeenCalledTimes(1);
    const token: any = await Token.findOne({ type: 'password' });
    expect(token.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('mesma resposta para conta inexistente e para conta inativa (sem enumeração)', async () => {
    await createUser({ active: false });
    const unknown = await json(await POST(req('POST', { email: 'ninguem@example.com', token: 'ok' })));
    const inactive = await json(await POST(req('POST', { email: 'teste@example.com', token: 'ok' })));
    expect(unknown).toEqual(inactive);
    expect(unknown.status).toBe(200);
    expect(mailer()).not.toHaveBeenCalled();
  });

  it('rejeita quando o reCAPTCHA falha', async () => {
    await createUser();
    const { status, body } = await json(await POST(req('POST', { email: 'teste@example.com', token: 'bot' })));
    expect(status).toBe(422);
    expect(body.error).toBe('is-bot');
    expect(mailer()).not.toHaveBeenCalled();
  });

  it('limita a 3 e-mails por hora por conta', async () => {
    await createUser();
    for (let i = 0; i < 5; i++) await POST(req('POST', { email: 'teste@example.com', token: 'ok' }));
    expect(mailer()).toHaveBeenCalledTimes(3);
  });

  it('limita por IP (429 depois de 10 pedidos/hora)', async () => {
    let last = 0;
    for (let i = 0; i < 11; i++) last = (await POST(req('POST', { email: `a${i}@example.com`, token: 'ok' }))).status;
    expect(last).toBe(429);
  });
});

describe('PUT /api/account/reset-password (definir nova senha)', () => {
  beforeEach(() => setIp('10.0.0.1'));

  it('troca a senha, invalida sessões (sessionVersion) e consome o token', async () => {
    const user: any = await createUser();
    await createToken(user._id, 'password', 'reset-token');

    const { status } = await json(await PUT(req('PUT', { tokenId: 'reset-token', password: 'NovaSenha789!' })));
    expect(status).toBe(200);

    const updated: any = await User.findById(user._id);
    expect(await isPasswordValid('NovaSenha789!', updated.password)).toBe(true);
    expect(await isPasswordValid(PASSWORD, updated.password)).toBe(false);
    expect(updated.sessionVersion).toBe(1);
    expect(await Token.countDocuments({})).toBe(0);

    const reuse = await json(await PUT(req('PUT', { tokenId: 'reset-token', password: 'OutraSenha000!' })));
    expect(reuse.status).toBe(400);
  });

  it('rejeita senha curta com 422 sem consumir o token', async () => {
    const user: any = await createUser();
    await createToken(user._id, 'password', 'reset-token');
    const { status } = await json(await PUT(req('PUT', { tokenId: 'reset-token', password: '123' })));
    expect(status).toBe(422);
    expect(await Token.countDocuments({})).toBe(1);
  });

  it('não aceita token de ativação', async () => {
    const user: any = await createUser();
    await createToken(user._id, 'activation', 'act-token');
    const { status } = await json(await PUT(req('PUT', { tokenId: 'act-token', password: 'NovaSenha789!' })));
    expect(status).toBe(400);
  });

  it('rejeita token expirado (> 1h)', async () => {
    const user: any = await createUser();
    await createToken(user._id, 'password', 'old');
    await Token.updateOne({ userId: user._id }, { createdAt: new Date(Date.now() - 2 * 3600_000) });
    const { status } = await json(await PUT(req('PUT', { tokenId: 'old', password: 'NovaSenha789!' })));
    expect(status).toBe(400);
  });

  it('tokenId como objeto não faz match (NoSQL injection)', async () => {
    const user: any = await createUser();
    await createToken(user._id, 'password', 'reset-token');
    const { status } = await json(await PUT(req('PUT', { tokenId: { $ne: '' }, password: 'NovaSenha789!' })));
    expect(status).toBe(400);
    expect(await isPasswordValid(PASSWORD, ((await User.findById(user._id)) as any).password)).toBe(true);
  });
});
