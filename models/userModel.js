const crypto = require('crypto');
const mongoose = require('mongoose');

const crypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'user name must not be empty'],
    minlength: [5, 'user name must be more then 5 characters'],
  },
  email: {
    type: String,
    required: [true, 'email must not be empty'],
    unique: true,
    validate: {
      validator: function (val) {
        return val.match(
          /^([a-zA-Z0-9_\-.]+)@([a-zA-Z0-9_\-.]+)\.([a-zA-Z]{2,5})$/
        );
      },
      message: (props) => {
        return `${props.value} is not a valid Email,  please try again !`;
      },
    },
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead', 'admin'],
    default: 'user',
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  password: {
    type: String,
    minlength: 8,
    select: false,
    required: [true, 'password  must not be empty'],
  },
  passwordConfirm: {
    type: String,

    required: [true, 'password confirmation must not be empty'],
    validate: {
      //Work only on Save or Create
      validator: function (prop) {
        return prop === this.password;
      },
      message: 'passwords are not equale',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpired: String,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await crypt.hash(this.password, 12);
  //Delete passowrdConfirm prop
  this.passwordConfirm = undefined;

  next();
});
// Change passwordChangedAt when modifying he password
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// instance method (a method that is avaliable in all instances)
// password check when login
userSchema.methods.verifyPassword = async function (
  condidtatePassword,
  userPassword
) {
  return await crypt.compare(condidtatePassword, userPassword);
};

// check if jwt.iat > passwordChanged at

userSchema.methods.isPasswordchanged = function (jwtIat) {
  if (this.passwordChangedAt) {
    const passwordChangedAtTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return jwtIat < passwordChangedAtTimeStamp;
  }

  return false;
};

// Create reset passowrd token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpired = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
const User = mongoose.model('User', userSchema);

module.exports = User;
