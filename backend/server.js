require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { initSocket } = require('./lib/websocket');
const apiRoutes = require('./Route/api');
const { connectDB } = require('./lib/mongodb');
const app = express();
app.set('trust proxy', 1);
//websocket server setup
const httpServer = createServer(app);
initSocket(httpServer);

const devOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || devOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

//api routes
app.use('/api', apiRoutes);

httpServer.listen(4000, () => {
  console.log('Server is running on port 4000');
});

void connectDB();
