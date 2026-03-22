require('dotenv').config(); // Load secrets securely
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');

// Connect to MongoDB Database
connectDB();

const ingestionRoutes = require('./src/routes/ingestionRoutes');
const queueRoutes = require('./src/routes/queueRoutes');


// Load Background Worker
require('./src/workers/whatsappWorker');

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/ingestion', ingestionRoutes);
app.use('/api/queue', queueRoutes);

app.get('/', (req, res) => {
  res.send({ status: 'success', message: 'Prasadam Distribution Backend API is running on Cloud Run!' });
});

app.get('/health', (req, res) => {
  res.send({ status: 'ok' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

