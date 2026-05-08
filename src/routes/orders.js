const express = require('express')
const prisma = require('../lib/prisma')
const auth = require('../middleware/auth')

const router = express.Router()

// All routes require authentication
router.use(auth)

// GET /orders
router.get('/', async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query

    const [orders, count] = await Promise.all([
      prisma.order.findMany({
        where: { customerId: req.customer.id },
        include: {
          items: true,
          shippingOption: true,
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.order.count({ where: { customerId: req.customer.id } }),
    ])

    return res.json({ orders, count, limit: parseInt(limit), offset: parseInt(offset) })
  } catch (error) {
    next(error)
  }
})

// GET /orders/:id
router.get('/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, customerId: req.customer.id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, title: true, handle: true, thumbnail: true } },
              },
            },
          },
        },
        shippingOption: true,
      },
    })

    if (!order) {
      return res.status(404).json({ message: 'Order not found' })
    }

    return res.json({ order })
  } catch (error) {
    next(error)
  }
})

module.exports = router
