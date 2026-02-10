const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname)); // Serves your index.html

let roomHistory = {
    'general': [],
    'gaming': [],
    'code-talk': []
};

io.on('connection', (socket) => {
    const vibeColor = `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`;
    // const userId = socket.id.substring(0, 5);
    socket.userName = "Anonymous";
    socket.join('general');
    socket.currentRoom = 'general';

    //socket.emit('load history', msgHistory);

    socket.on('set-identity', (name) => {
        socket.userName = name;
        console.log(`${socket.userName} joined the vibe.`);
    });

    socket.on('switch-room', ({ oldRoom, newRoom }) => {
        socket.leave(oldRoom);
        socket.join(newRoom);
        socket.currentRoom = newRoom;
        console.log(`${socket.userName} moved to ${newRoom}`);

        if (!roomHistory[newRoom]) {
            roomHistory[newRoom] = [];
        }
        // If you want history per room, you'd load it here
        socket.emit('load history', roomHistory[newRoom]);
    });

    socket.on('chat message', (msg) => {
        const data = {
            text: msg,
            color: vibeColor,
            userName: socket.userName // Send the real name!
        };

        // Save to the specific room's history
        const room = socket.currentRoom;
        roomHistory[room].push(data);

        // Keep each room's history at a reasonable limit
        if (roomHistory[room].length > 50) {
            roomHistory[room].shift();
        }

        io.to(room).emit('chat message', data);
    });

    socket.on('typing', () => {
        socket.broadcast.emit('user typing', { id: socket.userName });
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