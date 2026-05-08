const { verifyToken } = require('../lib/jwt')
const prisma = require('../lib/prisma')

/**
 * Middleware to authenticate admins via JWT
 * Checks Authorization header (Bearer token) or admin_token cookie
 */
async function adminAuth(req, res, next) {
  try {
    let token = null

    // Check Authorization header
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    // Fallback to cookie
    if (!token && req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token
    }

    if (!token) {
      return res.status(401).json({ message: 'Admin authentication required' })
    }

    const decoded = verifyToken(token, true)

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' })
    }

    req.admin = admin
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired admin token' })
  }
}

/**
 * Middleware to require SUPER_ADMIN role
 */
function requireSuperAdmin(req, res, next) {
  if (!req.admin || req.admin.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ message: 'Super admin access required' })
  }
  next()
}

module.exports = adminAuth
module.exports.requireSuperAdmin = requireSuperAdmin
