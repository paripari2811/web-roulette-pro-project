const express = require('express');
const dotenv = require('dotenv');
const flash = require('connect-flash');
const path = require('path');
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const expressValidator = require('express-validator');
const nunjucks = require('nunjucks');
global.moment = require('moment');

var app = express();
dotenv.config();
var port = process.env.PORT;
global.now = new Date();

var server = require('http').createServer(app);
io = require('socket.io')(server, {
  cors: {
    origin: "*"
  }
});

require('./config/logconfig.js');

app.use(expressValidator());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
const chokidar = require('chokidar');

//view engine setup
app.use(express.static(path.join(__dirname, 'public')));
nunjucks.configure('app/views', {
  autoescape: true,
  express: app,
  watch: true
});
app.set('view engine', 'html');

//set in headers in every request
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(cookieSession({
  name: 'session',
  keys: [ "roulettecookie" ],
  maxAge: 24 * 60 * 60 * 1000
}));

app.use(flash());
app.use(fileUpload());

//Start: Load model, controller, helper, and route
var controllers = require('./app/controllers/index')();
require('./routes/index.js')(app, controllers);
global.helper = require('./app/helpers/helpers.js');

//Start: Server connection
app.set('port', port);
server.listen(port, function () {
  console.log("(----------------------------------------)");
  console.log("|          Server Started at...          |");
  console.log("|          http://localhost:" + port + "         |");
  console.log("(----------------------------------------)");
});
//End: Server connection

var socket_count = 0;
io.on('connection', function (client) {
  socket_count++;
  io.emit('count', socket_count);
  console.log("Socket connection established", socket_count);
  require('./socket/index')(io, client);
  client.on('disconnect', function () {
    io.emit('count', socket_count);
    console.log("Socket disconnected", socket_count);
  });
});
//End: Socket connection code

//catch 404 and forward to error handler
require('./config/error.js')(app);
module.exports = { app: app, server: server };
