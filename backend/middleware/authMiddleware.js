const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require("../models/UserModel");
const { isUserAdmin } = require("../utils/adminAccess");

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select(
        "-password -resetPasswordToken -resetPasswordExpires -signupOtpHash -signupOtpExpires -__v"
      );

      // ✅ user deleted but token still exists
      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      // ✅ block user access
      if (req.user.isBlocked) {
        res.status(403);
        throw new Error('Your account is blocked');
      }

      req.user.isAdmin = isUserAdmin(req.user);

      return next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  res.status(401);
  throw new Error('Not authorized, no token');
});

const admin = (req, res, next) => {
  if (req.user && isUserAdmin(req.user)) {
    return next();
  }

  res.status(403);
  throw new Error('Not authorized as an admin');
};

module.exports = { protect, admin };
