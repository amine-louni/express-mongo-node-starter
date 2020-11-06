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

const DB_URI = process.env.DB_URI.replace(
  '<dbname>',
  process.env.DB_NAME
).replace('<password>', process.env.DB_PASS);

const connectDB = async () => {
  try {
    await mongoose.connect(DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });
    console.log('Database connected ✅');
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};
// Connection to DB
connectDB();

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
