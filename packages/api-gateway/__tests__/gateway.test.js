const request = require('supertest');
const app = require('../src/app');

describe('API Gateway', () => {
  it('GET /health returns OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'OK');
  });
});
