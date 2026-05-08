const express = require('express')
const bcrypt = require('bcryptjs')
const { body, validationResult } = require('express-validator')
const prisma = require('../lib/prisma')
const { generateToken } = require('../lib/jwt')
const auth = require('../middleware/auth')

const router = express.Router()

// POST /auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('phone').optional().trim(),
    body('cpf').optional().trim()
      .matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/).withMessage('CPF inválido'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() })
      }

      const { email, password, firstName, lastName, phone, cpf } = req.body

      const existing = await prisma.customer.findUnique({ where: { email } })
      if (existing) {
        return res.status(409).json({ message: 'Email already registered' })
      }

      // Verifica CPF duplicado se fornecido
      if (cpf) {
        const cpfClean = cpf.replace(/\D/g, '')
        const existingCpf = await prisma.customer.findUnique({ where: { cpf: cpfClean } })
        if (existingCpf) {
          return res.status(409).json({ message: 'CPF já cadastrado' })
        }
      }

      const passwordHash = await bcrypt.hash(password, 10)

      const customer = await prisma.customer.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          phone: phone || null,
          cpf: cpf ? cpf.replace(/\D/g, '') : null,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          cpf: true,
          createdAt: true,
        },
      })

      const token = generateToken({ id: customer.id, email: customer.email }, '7d', false)

      res.cookie('customer_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })

      return res.status(201).json({ customer, token })
    } catch (error) {
      next(error)
    }
  }
)

// POST /auth/login
router.post(
  '/login',
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

      const customer = await prisma.customer.findUnique({ where: { email } })
      if (!customer) {
        return res.status(401).json({ message: 'Invalid email or password' })
      }

      const valid = await bcrypt.compare(password, customer.passwordHash)
      if (!valid) {
        return res.status(401).json({ message: 'Invalid email or password' })
      }

      const token = generateToken({ id: customer.id, email: customer.email }, '7d', false)

      res.cookie('customer_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })

      const { passwordHash, ...customerData } = customer

      return res.json({ customer: customerData, token })
    } catch (error) {
      next(error)
    }
  }
)

// POST /auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('customer_token')
  return res.json({ message: 'Logged out successfully' })
})

// GET /auth/me
router.get('/me', auth, async (req, res, next) => {
  try {
    return res.json({ customer: req.customer })
  } catch (error) {
    next(error)
  }
})

// PUT /auth/me
router.put(
  '/me',
  auth,
  [
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('phone').optional().trim(),
    body('cpf').optional().trim()
      .matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/).withMessage('CPF inválido'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() })
      }

      const { firstName, lastName, phone, cpf, password } = req.body
      const updateData = {}

      if (firstName) updateData.firstName = firstName
      if (lastName) updateData.lastName = lastName
      if (phone !== undefined) updateData.phone = phone
      if (password) updateData.passwordHash = await bcrypt.hash(password, 10)

      if (cpf !== undefined) {
        const cpfClean = cpf ? cpf.replace(/\D/g, '') : null
        // Verifica duplicata (excluindo o próprio usuário)
        if (cpfClean) {
          const existingCpf = await prisma.customer.findFirst({
            where: { cpf: cpfClean, NOT: { id: req.customer.id } },
          })
          if (existingCpf) {
            return res.status(409).json({ message: 'CPF já cadastrado' })
          }
        }
        updateData.cpf = cpfClean
      }

      const customer = await prisma.customer.update({
        where: { id: req.customer.id },
        data: updateData,
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

      return res.json({ customer })
    } catch (error) {
      next(error)
    }
  }
)

module.exports = router
