const amqp = require('amqplib');

let channel = null;

const connectToQueue = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    channel = await connection.createChannel();
    
    // Assert exchanges and queues
    await channel.assertExchange('orders', 'topic', { durable: true });
    
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    setTimeout(connectToQueue, 5000); // Retry after 5 seconds
  }
};

const sendToQueue = async (routingKey, message) => {
  if (!channel) {
    throw new Error('RabbitMQ channel not available');
  }
  
  await channel.publish('orders', routingKey, Buffer.from(JSON.stringify(message)), {
    persistent: true
  });
  
  console.log(`Sent message to orders exchange with routing key: ${routingKey}`);
};

const consumeFromQueue = async (queueName, routingKey, callback) => {
  if (!channel) {
    throw new Error('RabbitMQ channel not available');
  }
  
  // Assert queue
  const { queue } = await channel.assertQueue(queueName, { durable: true });
  
  // Bind queue to exchange
  await channel.bindQueue(queue, 'orders', routingKey);
  
  // Consume messages
  await channel.consume(queue, (message) => {
    if (message !== null) {
      const content = JSON.parse(message.content.toString());
      callback(content);
      channel.ack(message);
    }
  });
  
  console.log(`Started consuming from queue: ${queue} with routing key: ${routingKey}`);
};

module.exports = {
  connectToQueue,
  sendToQueue,
  consumeFromQueue
};
