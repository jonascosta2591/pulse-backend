const express = require('express')
const { body, validationResult } = require('express-validator')
const prisma = require('../../lib/prisma')
const adminAuth = require('../../middleware/adminAuth')

const router = express.Router()

// All routes require admin auth
router.use(adminAuth)

// GET /admin/orders
router.get('/', async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, status, payment_status } = req.query

    const where = {}
    if (status) where.status = status
    if (payment_status) where.paymentStatus = payment_status

    const [orders, count] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, email: true, firstName: true, lastName: true } },
          items: true,
          shippingOption: true,
        },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ])

    return res.json({ orders, count, limit: parseInt(limit), offset: parseInt(offset) })
  } catch (error) {
    next(error)
  }
})

// GET /admin/orders/:id
router.get('/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
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

// PUT /admin/orders/:id
router.put(
  '/:id',
  [
    body('status').optional().isIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
    body('paymentStatus').optional().isIn(['AWAITING', 'CAPTURED', 'REFUNDED', 'CANCELLED']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() })
      }

      const existing = await prisma.order.findUnique({ where: { id: req.params.id } })
      if (!existing) return res.status(404).json({ message: 'Order not found' })

      const { status, paymentStatus } = req.body
      const updateData = {}

      if (status !== undefined) updateData.status = status
      if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus

      const order = await prisma.order.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          customer: { select: { id: true, email: true, firstName: true, lastName: true } },
          items: true,
          shippingOption: true,
        },
      })

      return res.json({ order })
    } catch (error) {
      next(error)
    }
  }
)

// POST /admin/orders/:id/cancel
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const existing = await prisma.order.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Order not found' })

    if (['CANCELLED', 'REFUNDED', 'DELIVERED'].includes(existing.status)) {
      return res.status(400).json({ message: `Cannot cancel an order with status: ${existing.status}` })
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
        paymentStatus: existing.paymentStatus === 'CAPTURED' ? 'REFUNDED' : 'CANCELLED',
      },
      include: {
        customer: { select: { id: true, email: true, firstName: true, lastName: true } },
        items: true,
        shippingOption: true,
      },
    })

    // Restore inventory
    for (const item of existing.items || []) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { inventory: { increment: item.quantity } },
      }).catch(() => {}) // Ignore if variant no longer exists
    }

    return res.json({ order })
  } catch (error) {
    next(error)
  }
})

module.exports = router
