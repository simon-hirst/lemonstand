const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

/*
 * Simple JWT authentication middleware.
 *
 * Orders service does not have direct access to the users collection,
 * so this middleware simply verifies the token signature and attaches
 * the decoded payload to `req.user`. Additional checks (e.g. ensuring
 * the user still exists or has a valid role) should be performed by
 * upstream services (like the auth service) or by including user info
 * in the token payload. If no token is provided or verification fails,
 * an authentication error is returned.
 */
module.exports = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please provide a valid token.', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach the decoded token (contains user id, role etc.) to the request
    req.user = decoded;
    return next();
  } catch (err) {
    return next(new AppError('Invalid or expired token. Please log in again.', 401));
  }
};