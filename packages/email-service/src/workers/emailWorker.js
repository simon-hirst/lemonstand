const amqp = require('amqplib');

let connection;
let channel;

/**
 * Establish a connection to the RabbitMQ broker and create a channel.
 *
 * Reads the broker URL from the RABBITMQ_URL environment variable, defaulting
 * to amqp://localhost when unset. The caller should await this promise
 * before attempting to publish or consume messages.
 */
async function connectToQueue() {
  const url = process.env.RABBITMQ_URL || 'amqp://localhost';
  connection = await amqp.connect(url);
  channel = await connection.createChannel();
  // Ensure the default exchange exists. Named exchanges will be asserted when used.
  return channel;
}

/**
 * Publish a message to an exchange with a given routing key.
 *
 * If the channel has not yet been initialised, an error will be thrown.
 *
 * @param {string} exchange The exchange name
 * @param {string} routingKey The routing key
 * @param {Object} message The message payload
 */
async function publish(exchange, routingKey, message) {
  if (!channel) {
    throw new Error('RabbitMQ channel has not been created. Call connectToQueue first.');
  }
  await channel.assertExchange(exchange, 'topic', { durable: true });
  const content = Buffer.from(JSON.stringify(message));
  channel.publish(exchange, routingKey, content, { persistent: true });
}

/**
 * Consume messages from a queue bound to an exchange and routing key.
 *
 * The callback will be invoked for each message received with the parsed
 * JSON payload. Messages are acknowledged automatically after the callback
 * resolves. Any uncaught errors will be logged.
 *
 * @param {string} queueName The queue to consume from
 * @param {string} routingKey The routing key pattern to bind
 * @param {function(Object): Promise<void>} callback Async handler for message payloads
 */
async function consumeFromQueue(queueName, routingKey, callback) {
  if (!channel) {
    throw new Error('RabbitMQ channel has not been created. Call connectToQueue first.');
  }
  const exchange = 'emails';
  await channel.assertExchange(exchange, 'topic', { durable: true });
  const { queue } = await channel.assertQueue(queueName, { durable: true });
  await channel.bindQueue(queue, exchange, routingKey);
  await channel.consume(queue, async (msg) => {
    try {
      const payload = JSON.parse(msg.content.toString());
      await callback(payload);
      channel.ack(msg);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error handling email message:', err);
      channel.nack(msg, false, false);
    }
  });
}

module.exports = {
  connectToQueue,
  consumeFromQueue,
  publish
};