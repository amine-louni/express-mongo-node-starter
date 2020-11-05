const crypto = require('crypto');
const { promisify } = require('util');

const jwt = require('jsonwebtoken');

const cathAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
//const sendMail = require('../utils/Email');
const User = require('../models/userModel');

const Email = require('../utils/Email');

const singingToken = (id) => {
  return jwt.sign(
    {
      id,
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: process.env.JWT_EXPIRED_IN }
  );
};
const createSendToken = (user, status, req, res) => {
  const token = singingToken(user._id);
  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRED_IN * 24 * 60 * 60 * 1000
    ),
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    httpOnly: true,
  });

  // just remove password from the response
  user.password = undefined;

  res.status(status).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};
exports.signUp = cathAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);
  const url = `${req.protocol}://${req.get('host')}/me`;

  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, req, res);
});

exports.login = cathAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1 ) Check if email & password inputs exists
  if (!password || !email) {
    return next(new AppError('you need to specify email and password', 400));
  }

  // 2 ) Check if user & password exits

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.verifyPassword(password, user.password))) {
    return next(new AppError('incorrect email or password ', 401));
  }

  // 3 ) Every thing is okay !
  createSendToken(user, 200, req, res);
});
exports.logout = (req, res, next) => {
  res.cookie('jwt', 'loggedouting', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};
exports.protect = cathAsync(async (req, res, next) => {
  // 1) Check if tokens exits in the request Header
  let token;

  const headerTokens = req.headers.authorization;

  if (headerTokens && headerTokens.startsWith('Bearer')) {
    token = headerTokens.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in , please login and try again', 401)
    );
  }

  // 2) token verification  (check if some one manipulates the data or token already expired)
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET_KEY
  );

  // (IMPORTANT) if the user  no longer exits we should delete token
  // 3) Check if user exits
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('This user no longer exits', 401));
  }

  // (IMPORTANT) check  jwt token if it was  created before password changed  and refuse it
  // 4) Check if the token is created after password has changed
  const ispassDeprecated = currentUser.isPasswordchanged(decoded.iat);
  if (ispassDeprecated) {
    return next(new AppError('this password has been already changed', 401));
  }

  /**
   * If you could make it till here you have
   * the green light to access the resource (^^)
   * & i will send the current user on the request as a prize for you
   * Enjoy !
   */
  //
  res.locals.currentUser = currentUser.toJSON();
  req.currentUser = currentUser;

  next();
});

// Only for rendering pages, no errors !
exports.isLoggedIn = async (req, res, next) => {
  // // 1) Check if tokens exits in the request cookies
  const headerTokens = req.headers.authorization;

  if (headerTokens && headerTokens.startsWith('Bearer')) {
    console.log('header token found');
    try {
      // 2) token verification  (check if some one manipulates the data or token already expired)
      const decoded = await promisify(jwt.verify)(
        headerTokens,
        process.env.JWT_SECRET_KEY
      );

      // (IMPORTANT) if the user  no longer exits we should delete token
      // 3) Check if user exits
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // (IMPORTANT) check  jwt token if it was  created before password changed  and refuse it
      // 4) Check if the token is created after password has changed
      const ispassDeprecated = currentUser.isPasswordchanged(decoded.iat);
      if (ispassDeprecated) {
        return next();
      }

      /**
          THERE IS A LOGIN USER
          WE PASS THE DATA TO VIEWS
         */
      //
      // res.locals.currentUser = currentUser.toJSON();
      res.status(200).json({
        status: 'success',
        user: currentUser,
      });

      return next();
    } catch (err) {
      return next();
    }
  }

  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.currentUser.role)) {
      return next(
        new AppError(
          "You don't have the permission to preform that action",
          403
        )
      );
    }
    next();
  };
};

exports.forgotPassword = cathAsync(async (req, res, next) => {
  // 1 ) GET USER BASED ON POSTED EMAIL
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError("This email doesn't exists"), 404);
  }
  // 2 ) GENERATE RANDOM TOKEN
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  // 3 ) SEND IT TO USER EMAIL !

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/reset-password/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.createPasswordResetToken = undefined;
    user.passwordResetExpires = undefined;
    return next(
      new AppError('There was an error while sending the email', 500)
    );
  }
});
exports.resetPassword = cathAsync(async (req, res, next) => {
  // 1 ) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpired: { $gt: Date.now() },
  });

  // 2 ) if the token has not expired and there is a user , set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpired = undefined;
  await user.save();

  // 3 ) Update changedPasswordAt property for the user
  // Middleware in the model on pre save hook

  // 4 ) log the user in , send JWT

  createSendToken(user, 200, res);
});

exports.updatePassword = cathAsync(async (req, res, next) => {
  // 1 ) Get the user
  const user = await User.findById(req.currentUser.id).select('+password');

  // 2 ) Check if posted password is correct
  if (!(await user.verifyPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Password is incorrect', 401));
  }

  // 3 ) Update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4 ) Log user in, (send JWT)
  createSendToken(user, 200, res);
});
