import { POST } from '@/app/api/auth/signup/route';
import User from '@/models/User';
import Token from '@/models/Token';
import { json, mailer, req, setIp, PASSWORD } from '../helpers';

const valid = { name: 'Fulano', email: 'Fulano@Example.com', password: PASSWORD, token: 'ok' };

describe('POST /api/auth/signup', () => {
  beforeEach(() => setIp('10.0.0.1'));

  it('cria usuário inativo, e-mail minúsculo, senha com hash e token de ativação com hash', async () => {
    const { status } = await json(await POST(req('POST', valid)));
    expect(status).toBe(201);

    const user: any = await User.findOne({ email: 'fulano@example.com' });
    expect(user).toBeTruthy();
    expect(user.active).toBe(false);
    expect(user.password).not.toBe(PASSWORD);
    expect(user.password).toMatch(/^\$2[aby]\$/);

    const token: any = await Token.findOne({ userId: user._id });
    expect(token.type).toBe('activation');
    expect(token.token).toMatch(/^[0-9a-f]{64}$/); // sha256, nunca o valor cru
    expect(mailer()).toHaveBeenCalledTimes(1);
  });

  it('ignora campos extras (mass assignment): active/twoFactorEnabled vindos do cliente', async () => {
    await POST(req('POST', { ...valid, active: true, twoFactorEnabled: true, sessionVersion: 99 }));
    const user: any = await User.findOne({ email: 'fulano@example.com' });
    expect(user.active).toBe(false);
    expect(user.twoFactorEnabled).toBe(false);
    expect(user.sessionVersion).toBe(0);
  });

  it('e-mail duplicado devolve a mesma resposta (sem enumeração) e não cria outro usuário', async () => {
    const first = await json(await POST(req('POST', valid)));
    const second = await json(await POST(req('POST', { ...valid, email: 'fulano@example.com' })));
    expect(second.status).toBe(first.status);
    expect(second.body).toEqual(first.body);
    expect(await User.countDocuments({})).toBe(1);
  });

  it.each([
    ['senha curta', { password: '123' }],
    ['senha acima de 72 bytes', { password: 'a'.repeat(73) }],
    ['e-mail inválido', { email: 'nao-e-email' }],
    ['nome vazio', { name: '   ' }],
    ['nome grande', { name: 'x'.repeat(51) }],
    ['senha como objeto (NoSQL)', { password: { $gt: '' } }],
    ['e-mail como objeto (NoSQL)', { email: { $ne: null } }],
  ])('rejeita %s com 422', async (_n, patch) => {
    const { status } = await json(await POST(req('POST', { ...valid, ...patch })));
    expect(status).toBe(422);
    expect(await User.countDocuments({})).toBe(0);
  });

  it('rejeita corpo que não é JSON com 400', async () => {
    const { status } = await json(await POST(req('POST', undefined, 'isso não é json')));
    expect(status).toBe(400);
  });

  it('rejeita quando o reCAPTCHA falha', async () => {
    const { status, body } = await json(await POST(req('POST', { ...valid, token: 'bot' })));
    expect(status).toBe(422);
    expect(body.error).toBe('is-bot');
    expect(await User.countDocuments({})).toBe(0);
  });

  it('aplica rate limit por IP (429 após 10 cadastros/hora)', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await POST(req('POST', { ...valid, email: `u${i}@example.com` }));
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
