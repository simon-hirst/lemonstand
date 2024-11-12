const request = require('supertest');
const app = require('../app');
const User = require('../models/User');

describe('Auth API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.user.email).toEqual('test@example.com');
      expect(res.body.data.user.firstName).toEqual('Test');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should not register user with existing email', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toEqual('fail');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      });
    });

    it('should login existing user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.user.email).toEqual('test@example.com');
      expect(res.body.data).toHaveProperty('token');
    });

    it('should not login with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toEqual('fail');
    });
  });
});
