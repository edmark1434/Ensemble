const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { initSocket } = require('./lib/websocket');
const apiRoutes = require('./Route/api');

const app = express();
//websocket server setup
const httpServer = createServer(app);
initSocket(httpServer);

//origin URL allowed to access the backend, can be set via environment variable FRONTEND_URL, defaults to localhost:5173 for development
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

//middleware for cors policy and parsing JSON bodies
app.use(cors({
  origin: allowedOrigin,
  credentials: true,
}));
app.use(express.json());

//api routes
app.use('/api', apiRoutes);

//connect to database and start server
httpServer.listen(4000, () => {
  console.log('Server is running on port 4000');
});

