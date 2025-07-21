export const authMiddleware = (req, res, next) => {
  // Mock auth for development
  req.user = { id: 'test-user', name: 'Test User' };
  next();
};
