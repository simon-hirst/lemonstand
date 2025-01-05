const request = require('supertest');
const app = require('../src/app');

describe('Auth Service', () => {
  test('GET /health returns OK status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });
});