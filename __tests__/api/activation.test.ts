import { PUT } from '@/app/api/account/activation/route';
import { POST as SEND } from '@/app/api/account/activation/send/route';
import User from '@/models/User';
import Token from '@/models/Token';
import { createToken } from '@/utils/tokens';
import { createUser, json, mailer, req, setIp } from '../helpers';

describe('PUT /api/account/activation', () => {
  beforeEach(() => setIp('10.0.0.1'));

  it('ativa a conta e consome o token (uso único)', async () => {
    const user: any = await createUser({ active: false });
    await createToken(user._id, 'activation', 'raw-activation-token');

    const ok = await json(await PUT(req('PUT', { tokenId: 'raw-activation-token' })));
    expect(ok.status).toBe(200);
    expect((await User.findById(user._id) as any).active).toBe(true);
    expect(await Token.countDocuments({})).toBe(0);

    const again = await json(await PUT(req('PUT', { tokenId: 'raw-activation-token' })));
    expect(again.status).toBe(400);
  });

  it('não aceita token de outro tipo (reset de senha não ativa conta)', async () => {
    const user: any = await createUser({ active: false });
    await createToken(user._id, 'password', 'a-password-token');
    const { status } = await json(await PUT(req('PUT', { tokenId: 'a-password-token' })));
    expect(status).toBe(400);
    expect((await User.findById(user._id) as any).active).toBe(false);
  });

  it('rejeita token expirado (> 24h)', async () => {
    const user: any = await createUser({ active: false });
    await createToken(user._id, 'activation', 'old-token');
    await Token.updateOne({ userId: user._id }, { createdAt: new Date(Date.now() - 25 * 3600_000) });
    const { status } = await json(await PUT(req('PUT', { tokenId: 'old-token' })));
    expect(status).toBe(400);
  });

  it.each([[{ $ne: null }], [123], [null], [undefined], ['']])('rejeita tokenId inválido %p', async (tokenId) => {
    const { status } = await json(await PUT(req('PUT', { tokenId })));
    expect(status).toBe(400);
  });

  it('token órfão (usuário removido) devolve 400 e é apagado', async () => {
    const user: any = await createUser({ active: false });
    await createToken(user._id, 'activation', 'orphan');
    await User.deleteOne({ _id: user._id });
    const { status } = await json(await PUT(req('PUT', { tokenId: 'orphan' })));
    expect(status).toBe(400);
    expect(await Token.countDocuments({})).toBe(0);
  });

  it('aplica rate limit por IP (429 após 20 tentativas)', async () => {
    let last = 0;
    for (let i = 0; i < 21; i++) last = (await PUT(req('PUT', { tokenId: `x${i}` }))).status;
    expect(last).toBe(429);
  });
});

describe('POST /api/account/activation/send', () => {
  beforeEach(() => setIp('10.0.0.1'));

  it('422 sem e-mail', async () => {
    expect((await json(await SEND(req('POST', {})))).status).toBe(422);
  });

  it('envia o link para conta inativa', async () => {
    await createUser({ active: false });
    const { status } = await json(await SEND(req('POST', { email: 'TESTE@example.com' })));
    expect(status).toBe(200);
    expect(mailer()).toHaveBeenCalledTimes(1);
    expect(await Token.countDocuments({ type: 'activation' })).toBe(1);
  });

  it('responde igual e não envia nada para conta inexistente ou já ativa', async () => {
    await createUser({ active: true });
    const unknown = await json(await SEND(req('POST', { email: 'ninguem@example.com' })));
    const active = await json(await SEND(req('POST', { email: 'teste@example.com' })));
    expect(unknown).toEqual(active);
    expect(unknown.status).toBe(200);
    expect(mailer()).not.toHaveBeenCalled();
  });

  it('limita a 3 e-mails por hora por conta', async () => {
    await createUser({ active: false });
    for (let i = 0; i < 5; i++) await SEND(req('POST', { email: 'teste@example.com' }));
    expect(mailer()).toHaveBeenCalledTimes(3);
  });

  it('e-mail como objeto é tratado como ausente (422)', async () => {
    expect((await json(await SEND(req('POST', { email: { $ne: '' } })))).status).toBe(422);
  });
});
