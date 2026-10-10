import mongoose from 'mongoose';
import db from '@/utils/db';

// Sem rede e sem e-mail de verdade
jest.mock('next/headers', () => ({
  headers: jest.fn(async () => new Headers({ 'x-real-ip': '10.0.0.1' })),
}));
jest.mock('@/utils/nodemailer', () => ({
  transporter: { sendMail: jest.fn(async () => ({})) },
}));
jest.mock('@/utils/recaptcha', () => ({
  // o token "bot" simula falha no reCAPTCHA
  validatedHuman: jest.fn(async (token: unknown) => typeof token === 'string' && token !== 'bot' && token !== ''),
}));
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(async () => null),
}));

beforeAll(async () => {
  await db.connect();
  await mongoose.connection.dropDatabase();
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
  jest.clearAllMocks();
});

afterAll(async () => {
  await db.disconnect();
});
