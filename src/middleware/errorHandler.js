/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV === 'development'

  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      message: 'A record with this value already exists',
      field: err.meta?.target,
    })
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      message: 'Record not found',
    })
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' })
  }

  // Validation errors from express-validator
  if (err.type === 'validation') {
    return res.status(400).json({
      message: 'Validation error',
      errors: err.errors,
    })
  }

  const statusCode = err.statusCode || err.status || 500
  const message = err.message || 'Internal server error'

  const response = { message }

  if (isDev && err.stack) {
    response.stack = err.stack
  }

  console.error(`[ERROR] ${statusCode} - ${message}`)
  if (isDev) console.error(err.stack)

  res.status(statusCode).json(response)
}

module.exports = errorHandler
