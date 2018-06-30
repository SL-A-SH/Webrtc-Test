const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const publicPath = path.join(__dirname, './public');
let server = require('http').Server(app);
let io = require('socket.io')(server);

app.use(express.static(publicPath));

io.on('connection', (client) => {
  console.log('Client connected');

  client.on('disconnect', () => {
    console.log('Client Disconnected');
  });

  client.on('video-offer', (msg) => {
    client.broadcast.emit('video-offer-res', msg);
  });
  
  client.on('video-answer', (msg) => {
    client.broadcast.emit('video-answer-res', msg);
  });

  client.on('new-ice-candidate', (msg) => {
    client.broadcast.emit('candidate', msg);
  });

});

server.listen(port, () => {
  console.log('Server is UP');
});