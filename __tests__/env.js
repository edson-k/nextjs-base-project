// Executa antes de qualquer módulo da aplicação ser carregado
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27099/nextjs-base-test';
process.env.NEXTAUTH_SECRET = 'jest-nextauth-secret-jest-nextauth-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.WEB_URI = 'http://localhost:3000';
process.env.ENCRYPTION_KEY = 'jest-encryption-key-jest-encryption-key';
process.env.EMAIL = 'noreply@example.com';
process.env.MYAPP = 'JestApp';
