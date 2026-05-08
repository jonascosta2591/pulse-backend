const express = require('express')
const prisma = require('../../lib/prisma')
const adminAuth = require('../../middleware/adminAuth')

const router = express.Router()

// All routes require admin auth
router.use(adminAuth)

// GET /admin/customers
router.get('/', async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, q } = req.query

    const where = {}
    if (q) {
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [customers, count] = await Promise.all([
      prisma.customer.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          cpf: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { orders: true } },
        },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ])

    return res.json({ customers, count, limit: parseInt(limit), offset: parseInt(offset) })
  } catch (error) {
    next(error)
  }
})

// GET /admin/customers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        cpf: true,
        createdAt: true,
        updatedAt: true,
        addresses: true,
        orders: {
          include: { items: true, shippingOption: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' })
    }

    return res.json({ customer })
  } catch (error) {
    next(error)
  }
})

module.exports = router
