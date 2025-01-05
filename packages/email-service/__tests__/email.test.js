const { connectToQueue } = require('../src/workers/emailWorker');

describe('Email Worker', () => {
  test('connectToQueue should be defined', () => {
    expect(typeof connectToQueue).toBe('function');
  });
});