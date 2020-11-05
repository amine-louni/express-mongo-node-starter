/* eslint-disable no-console */
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({
  path: './config.env',
});

// Listening to a rejections
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('UNCAUGHT REJECTION 💥 shutting down the server ');

  console.log(err);
  process.exit(1);
});
const app = require('./app');

const DB = process.env.DB.replace('<PASSWORD>', process.env.DB_PASSWORD);

// Connect to database
mongoose
  .connect(DB, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((con) => {
    console.log(`Database connected ✔ | ${con.connections[0].name}`);
  });

// Listening
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(
    `express server is running on ${port} | mode ${process.env.NODE_ENV}...`.toUpperCase()
  );
});
// Listening to unhandled rejections
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);

  console.log('UNHANDLED REJECTION 💥 shutting down the server ');

  server.close(() => {
    process.exit(1);
  });
});

// Listening to SIGTERM by Heroku
process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED, Shutting down ⏳');
  server.close(() => {
    console.log('Process terminated 👌');
  });
});
