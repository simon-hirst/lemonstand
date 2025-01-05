const request = require('supertest');
const app = require('../src/app');

describe('Service Registry', () => {
  test('GET /registry returns a services object', async () => {
    const res = await request(app).get('/registry');
    expect(res.status).toBe(200);
    expect(typeof res.body).toBe('object');
  });
});