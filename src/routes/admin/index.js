const express = require('express')
const bcrypt = require('bcryptjs')
const { body, validationResult } = require('express-validator')
const prisma = require('../../lib/prisma')
const { generateToken } = require('../../lib/jwt')
const adminAuth = require('../../middleware/adminAuth')

const dashboardRouter = require('./dashboard')
const productsRouter = require('./products')
const ordersRouter = require('./orders')
const customersRouter = require('./customers')

const router = express.Router()

// Admin auth routes (no middleware required)

// POST /admin/auth/login
router.post(
  '/auth/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() })
      }

      const { email, password } = req.body

      const admin = await prisma.admin.findUnique({ where: { email } })
      if (!admin) {
        return res.status(401).json({ message: 'Invalid email or password' })
      }

      const valid = await bcrypt.compare(password, admin.passwordHash)
      if (!valid) {
        return res.status(401).json({ message: 'Invalid email or password' })
      }

      const token = generateToken({ id: admin.id, email: admin.email, role: admin.role }, '1d', true)

      res.cookie('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      })

      const { passwordHash, ...adminData } = admin

      return res.json({ admin: adminData, token })
    } catch (error) {
      next(error)
    }
  }
)

// POST /admin/auth/logout
router.post('/auth/logout', (req, res) => {
  res.clearCookie('admin_token')
  return res.json({ message: 'Logged out successfully' })
})

// GET /admin/auth/me
router.get('/auth/me', adminAuth, (req, res) => {
  return res.json({ admin: req.admin })
})

// POST /admin/auth/register (create first admin - should be protected in production)
router.post(
  '/auth/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('role').optional().isIn(['SUPER_ADMIN', 'ADMIN']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() })
      }

      const { email, password, name, role = 'ADMIN' } = req.body

      const existing = await prisma.admin.findUnique({ where: { email } })
      if (existing) {
        return res.status(409).json({ message: 'Email already registered' })
      }

      const passwordHash = await bcrypt.hash(password, 10)

      const admin = await prisma.admin.create({
        data: { email, passwordHash, name, role },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      })

      return res.status(201).json({ admin })
    } catch (error) {
      next(error)
    }
  }
)

// Mount sub-routers
router.use('/dashboard', dashboardRouter)
router.use('/products', productsRouter)
router.use('/orders', ordersRouter)
router.use('/customers', customersRouter)

module.exports = router
