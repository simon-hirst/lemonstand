const app = require('./app');
const { connectToQueue } = require('./workers/paymentWorker');

const PORT = process.env.PORT || 3004;

// Connect to message queue
connectToQueue();

app.listen(PORT, () => {
  console.log(`Payments Service running on port ${PORT}`);
});
