const jwt = require('jsonwebtoken');

/**
 * Middleware to protect routes by ensuring a valid JWT is provided.
 *
 * The JWT secret is read from the JWT_SECRET environment variable. On successful
 * verification the decoded payload is attached to `req.user`. If no token is
 * provided or verification fails a 401 response is sent.
 */
exports.protect = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * Restricts access to users with one of the specified roles.
 *
 * Requires `protect` to have run first and `req.user.role` to be set.
 */
exports.restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  return next();
};