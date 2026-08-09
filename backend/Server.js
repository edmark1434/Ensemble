require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { initSocket } = require('./lib/WebSocket');
const { connectMongoDB } = require('./lib/MongoDb');
const { connectPostgresDB } = require('./lib/Database');
const { startPaymentReconciliationJob } = require('./lib/BackgroundJob');

const app = express();
app.set('trust proxy', 1);

// Websocket server setup
const httpServer = createServer(app);

const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
  ],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Create a wrapper function to handle asynchronous startup sequence sequential ordering
async function startServer() {
  try {
    console.log('Connecting to databases...');
    
    // 1. Await database connections FIRST
    await Promise.all([
      await connectPostgresDB(),
      await connectMongoDB(),
      await initSocket(httpServer)
    ]);
    startPaymentReconciliationJob(); // Start the background job after DB connections
    // 2. Load API routes ONLY after database setups are fully initialized
const apiRoutes = require('./routes/Api');
    app.use('/api', apiRoutes);

    // 3. Finally, open up the HTTP ports
    httpServer.listen(4000, () => {
      console.log('Server successfully initialized and running on port 4000');
    });

  } catch (error) {
    console.error('Critical failure during server startup sequence:', error);
    process.exit(1); // Stop the application if crucial boot processes fail
  }
}

// Fire up the startup wrapper
startServer();
