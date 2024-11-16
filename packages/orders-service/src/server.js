const app = require('./app');
const mongoose = require('mongoose');
const { connectToQueue } = require('./workers/orderWorker');

const PORT = process.env.PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lemonstand-orders';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Connect to message queue
    await connectToQueue();
    
    app.listen(PORT, () => {
      console.log(`Orders Service running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
