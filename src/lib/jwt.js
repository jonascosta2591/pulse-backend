const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'pulse-super-secret-jwt-key-2024'
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'pulse-admin-secret-jwt-key-2024'

/**
 * Generate a JWT token
 * @param {object} payload - Data to encode
 * @param {string} expiresIn - Expiration time (e.g. '7d', '1d')
 * @param {boolean} isAdmin - Whether to use admin secret
 * @returns {string} JWT token
 */
function generateToken(payload, expiresIn = '7d', isAdmin = false) {
  const secret = isAdmin ? ADMIN_JWT_SECRET : JWT_SECRET
  return jwt.sign(payload, secret, { expiresIn })
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @param {boolean} isAdmin - Whether to use admin secret
 * @returns {object} Decoded payload
 */
function verifyToken(token, isAdmin = false) {
  const secret = isAdmin ? ADMIN_JWT_SECRET : JWT_SECRET
  return jwt.verify(token, secret)
}

module.exports = { generateToken, verifyToken }
