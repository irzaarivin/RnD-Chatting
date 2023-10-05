// DOTENV
require('dotenv').config();

// DECLARE EXPRESSJS
const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000'
}));

// app.use(express.static("public"))

// DECLARE CONTROLLERS
const userController = require('./controllers/userController');
const groupController = require('./controllers/groupController');
const projectController = require('./controllers/projectController');
const chatController = require('./controllers/chatController');

// DECLARE REDIS
const redis = require('ioredis');

// DECLARE SEQUELIZE DATABASE
const db = require('./models');
const User = db.User;

// DECLARE PARSER
const bodyParser = require('body-parser');
app.use(bodyParser.json());
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// DECLARE PASSPORT AUTH JSON WEBTOKEN BEARER SCHEMA
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;
const secretKey = process.env.SECRET_KEY;
const BearerStrategy = require('passport-http-bearer').Strategy;

passport.use(new BearerStrategy(
  (token, done) => {
    if (validToken(token)) {
      return done(null, { token: token });
    } else {
      return done(null, false);
    }
  }
));

// DECLARE SOCKET.IO & CONFIGURATION
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server);
const onlineUsers = {};

io.use((socket, next) => {
  if (socket.handshake.query && socket.handshake.query.token){
    jwt.verify(socket.handshake.query.token, secretKey, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.decoded = decoded;
      next();
    });
  }
  else {
    next(new Error('Authentication error'));
  }    
}).on('connection', async (socket) => {
  const user = await User.findByPk(socket.decoded.id);

  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log("BERHASIL JOIN : ", room)
    // onlineUsers[socket.id] = { room, online: true };
    // io.to(room).emit('updateOnlineStatus', onlineUsers);
  });

  socket.on('leaveRoom', (room) => {
    socket.leave(room);
    console.log("BERHASIL LEAVE : ", room)
  });

  socket.on('chatMessage', async (data) => {
    const { receiver, message } = data;
    const sender = user.email;
    const created = await chatController.create(sender, receiver, message);
    io.to(receiver).to(sender).emit('chatMessage', { receiver, message, sender, data: created });
  });

  socket.on('delMsg', (data) => {
    const { id, receiver } = data;
    const sender = user.email;
    io.to(receiver).to(sender).emit('delMsgTo', { receiver, sender, id });
  })

  // socket.on('disconnect', () => {
  //   console.log('User disconnected');
  //   if (onlineUsers[socket.id]) {
  //     onlineUsers[socket.id].online = false;
  //     io.to(onlineUsers[socket.id].room).emit('updateOnlineStatus', onlineUsers);
  //     delete onlineUsers[socket.id];
  //   }
  // });
});

app.get('/socket.io/socket.io.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/socket.io/client-dist/socket.io.js');
});

// Sinkronisasi model dengan database
db.sequelize.sync().then(() => {
  console.log('Database synced');
}).catch((err) => {
  console.error('Error syncing database: ', err);
});

// CONFIGURE REDIS
const redisClient = redis.createClient({
  host: 'localhost',
  port: 6379,
});

redisClient.on('error', (err) => {
  console.error('Gagal terkoneksi ke Redis:', err);
});

// MORE ROUTING
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

app.get('/wallpaper.jpg', (req, res) => {
  res.sendFile(__dirname + '/public/wallpaper.jpg');
});

app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/public/regist.html');
});

app.get('/chat', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/chat/findall', chatController.findAll);

app.delete('/chat/delete/:id', passport.authenticate('jwt', { session: false }), chatController.delMsg);

// CRUD USERS - AUTHENTICATED
app.post('/login', userController.login);
app.get('/auth/me', passport.authenticate('jwt', { session: false }), userController.getAuthUser);
app.put('/auth/me/update', passport.authenticate('jwt', { session: false }), userController.updateAuthUser);

// CRUD USERS - GENERAL
app.post('/create/user', userController.register);
app.get('/users', userController.getUsers);
app.get('/users/:id', userController.getUserById);
app.get('/users/email/:email', userController.getUserByEmail);
app.delete('/users/delete/:id', passport.authenticate('jwt', { session: false }), userController.deleteUserById);
app.delete('/users/delete/email/:email', passport.authenticate('jwt', { session: false }), userController.deleteUserByEmail);

// CRUD GROUPS
app.get('/groups', groupController.getGroups);
app.post('/create/group', passport.authenticate('jwt', { session: false }), groupController.createGroup);
app.put('/update/group', passport.authenticate('jwt', { session: false }), groupController.updateGroup);
app.delete('/delete/group/:id', passport.authenticate('jwt', { session: false }), groupController.deleteGroup);

// CRUD PROJECTS
app.get('/projects', projectController.getProjects);

// RUNNING SERVER
server.listen(3000, () => {
  console.log('Server is running on port 3000');
});