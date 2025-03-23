const request = require('supertest');
process.env.DISABLE_HEALTH_POLL = '1';
const app = require('../src/app');

describe('Service Registry', () => {
  it('GET /health returns OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'OK');
  });
});
