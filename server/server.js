
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', ({ roomId, nickname }) => {
        socket.join(roomId);
        socket.nickname = nickname;
        socket.roomId = roomId;
        socket.to(roomId).emit('user-joined', { id: socket.id, nickname });
    });

    socket.on('signal', ({ to, data }) => {
        io.to(to).emit('signal', { from: socket.id, data });
    });

    socket.on('disconnect', () => {
        if (socket.roomId && socket.nickname) {
            socket.to(socket.roomId).emit('user-left', { id: socket.id, nickname: socket.nickname });
        }
        console.log('User disconnected:', socket.id);
    });
});

server.listen(process.env.PORT || 5000, () => {
    console.log('Server running on port', process.env.PORT || 5000);
});
