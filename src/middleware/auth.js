const { verifyToken } = require('../lib/jwt')
const prisma = require('../lib/prisma')

/**
 * Middleware to authenticate customers via JWT
 * Checks Authorization header (Bearer token) or customer_token cookie
 */
async function auth(req, res, next) {
  try {
    let token = null

    // Check Authorization header
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    // Fallback to cookie
    if (!token && req.cookies && req.cookies.customer_token) {
      token = req.cookies.customer_token
    }

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const decoded = verifyToken(token, false)

    const customer = await prisma.customer.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        cpf: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!customer) {
      return res.status(401).json({ message: 'Customer not found' })
    }

    req.customer = customer
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

module.exports = auth
