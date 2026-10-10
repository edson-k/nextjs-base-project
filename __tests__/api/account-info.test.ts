import { GET } from '@/app/api/account/info/route';
import User from '@/models/User';
import { createUserWith2FA, createUser, json, loginAs, logout } from '../helpers';

describe('GET /api/account/info', () => {
  it('401 sem sessão', async () => {
    logout();
    const { status } = await json(await GET());
    expect(status).toBe(401);
  });

  it('devolve o usuário sem segredos', async () => {
    const { user } = await createUserWith2FA({ lastTotpCounter: 5 });
    loginAs(user);
    const { status, body } = await json(await GET());
    expect(status).toBe(200);
    expect(body.props.user.email).toBe('teste@example.com');
    for (const field of ['password', 'twoFactorSecret', 'recoveryCode', 'lastTotpCounter', 'sessionVersion']) {
      expect(body.props.user).not.toHaveProperty(field);
    }
  });

  it('401 quando a sessão foi invalidada (sessionVersion mudou)', async () => {
    const user: any = await createUser();
    loginAs(user); // sv = 0
    await User.updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });
    const { status } = await json(await GET());
    expect(status).toBe(401);
  });

  it('401 quando o usuário da sessão não existe mais', async () => {
    const user: any = await createUser();
    loginAs(user);
    await User.deleteOne({ _id: user._id });
    expect((await json(await GET())).status).toBe(401);
  });
});
