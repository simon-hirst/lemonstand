const { connectToQueue, consumeFromQueue } = require('./workers/emailWorker');

/**
 * Email Service entrypoint.
 *
 * Connects to RabbitMQ and begins consuming messages from the email service queue.
 * Messages are logged to the console. In a real implementation this is where
 * transactional emails would be sent using nodemailer or another provider.
 */
(async () => {
  try {
    await connectToQueue();
    // Consume all routing keys on the email-service queue
    await consumeFromQueue('email-service', '#', async (message) => {
      // eslint-disable-next-line no-console
      console.log('Email Service received message:', message);
      // TODO: integrate nodemailer and send actual emails
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start email service:', err);
    process.exit(1);
  }
})();
