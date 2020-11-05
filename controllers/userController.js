const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const handlerFactory = require('./handlerFactory');

//Helpers
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el].trim();
    }
  });
  return newObj;
};
//Multer config
// const multerStorage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'public/img/users');
//   },
//   filename: function (req, file, cb) {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.currentUser.id}-${Date.now()}.${ext}`);
//   },
// });

// Well instead store in memory as a buffer to pass it sharp in (req.file.buffer)
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Upload only images!', 400), false);
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
exports.uploadUserPhoto = upload.single('photo');
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.currentUser.id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});
// USERS ROUTES HANDLER
exports.getAllUsers = handlerFactory.getAll(User);
exports.getUser = handlerFactory.getOne(User);
// Do NOT use to update password !
exports.updateUser = handlerFactory.updateOne(User);
exports.deleteUser = handlerFactory.deleteOne(User);

exports.updateMe = catchAsync(async (req, res, next) => {
  // console.log(req.body);
  // console.log(req.file);
  // 1 ) Create error if user post a password data
  if (req.body.password || req.body.passwordConfirm) {
    next(new AppError('This route is not for password updates', 400));
  }

  // 2 ) Filtered out unwanted fields name
  const filteredBody = filterObj(req.body, 'name', 'email');
  // Add photo str to database
  if (req.file) filteredBody.photo = req.file.filename;
  //console.log(`after adding ${req.body}`);

  // 3 ) Update user document
  const updatedUser = await User.findByIdAndUpdate(
    req.currentUser.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  // 1) find
  await User.findByIdAndUpdate(req.currentUser.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getMe = (req, res, next) => {
  req.params.id = req.currentUser.id;

  next();
};
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'Fail ❌',
    message: 'This route is not defined ! , use /sign-up',
  });
};
