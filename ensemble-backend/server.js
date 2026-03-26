const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { initSocket } = require('./lib/websocket');
const apiRoutes = require('./Route/api');

const app = express();
//websocket server setup
const httpServer = createServer(app);
initSocket(httpServer);

//middleware
app.use(cors());
app.use(express.json());

//api routes
app.use('/api', apiRoutes);

//connect to database and start server
httpServer.listen(4000, () => {
  console.log('Server is running on port 4000');
});

