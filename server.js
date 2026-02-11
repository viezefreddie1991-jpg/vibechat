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
    //socket.userName = "Anonymous";
    //socket.join('general');
    socket.currentRoom = 'general';

    console.log('A user connected, waiting for identity...');

    socket.on('set-identity', (name) => {
        socket.userName = name;
        console.log(`${socket.userName} joined the vibe.`);
    });

    socket.on('user-joined', ({ name }) => {
        socket.userName = name;
        socket.currentRoom = 'general';
        socket.join('general');

        console.log(`${name} identified and joined general`);
        sendUserList('general');
    });

    socket.on('switch-room', ({ oldRoom, newRoom }) => {
        if (oldRoom) {
            socket.leave(oldRoom);
        }
        socket.join(newRoom);
        socket.currentRoom = newRoom;
        console.log(`${socket.userName} moved to ${newRoom}`);

        // Update both rooms
        sendUserList(oldRoom);
        sendUserList(newRoom);

        if (!roomHistory[newRoom]) {
            roomHistory[newRoom] = [];
        }
        // If you want history per room, you'd load it here
        socket.emit('load history', roomHistory[newRoom]);
    });

    socket.on('disconnect', () => {
        sendUserList(socket.currentRoom);
    });

    function sendUserList(room) {
        if (!room) return;
        // Get all sockets in the specific room
        const clients = io.sockets.adapter.rooms.get(room);
        const users = [];
        if (clients) {
            clients.forEach((socketId) => {
                const clientSocket = io.sockets.sockets.get(socketId);
                if (clientSocket.userName) users.push(clientSocket.userName);
            });
        }
        io.to(room).emit('update-user-list', { room, users });
    }

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