const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { createServer } = require('http');
const { initSocket } = require('./lib/websocket');

const app = express();
const httpServer = createServer(app);
initSocket(httpServer);
app.use(cors());
app.use(express.json());
httpServer.listen(4000, () => {
  console.log('Server is running on port 4000');
});

