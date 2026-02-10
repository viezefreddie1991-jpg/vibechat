const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname)); // Serves your index.html

let msgHistory = []; // The memory bank

io.on('connection', (socket) => {
    const vibeColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
    const userId = socket.id.substring(0, 5);

    socket.emit('load history', msgHistory);



    socket.on('chat message', (msg) => {
        const data = { text: msg, color: vibeColor, id: userId };

        // 2. Save the message to history
        msgHistory.push(data);

        // Keep only the last 50 messages
        if (msgHistory.length > 50) {
            msgHistory.shift();
        }

        io.emit('chat message', data);
    });

    socket.on('typing', () => {
        socket.broadcast.emit('user typing', { id: userId });
    });

    socket.on('stop typing', () => {
        socket.broadcast.emit('user stop typing');
    });
});

// CRITICAL: Use process.env.PORT for hosting
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});