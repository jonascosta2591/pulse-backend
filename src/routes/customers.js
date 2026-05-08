const express = require('express')
const { body, validationResult } = require('express-validator')
const prisma = require('../lib/prisma')
const auth = require('../middleware/auth')

const router = express.Router()

// All routes require authentication
router.use(auth)

// GET /customers/me/addresses
router.get('/me/addresses', async (req, res, next) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { customerId: req.customer.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })
    return res.json({ addresses })
  } catch (error) {
    next(error)
  }
})

// POST /customers/me/addresses
router.post(
  '/me/addresses',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('address1').trim().notEmpty().withMessage('Address line 1 is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('province').trim().notEmpty().withMessage('Province/State is required'),
    body('postalCode').trim().notEmpty().withMessage('Postal code is required'),
    body('countryCode').trim().notEmpty().withMessage('Country code is required'),
    body('phone').optional().trim(),
    body('isDefault').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() })
      }

      const { firstName, lastName, address1, address2, city, province, postalCode, countryCode, phone, isDefault } = req.body

      // If setting as default, unset other defaults
      if (isDefault) {
        await prisma.address.updateMany({
          where: { customerId: req.customer.id, isDefault: true },
          data: { isDefault: false },
        })
      }

      const address = await prisma.address.create({
        data: {
          customerId: req.customer.id,
          firstName,
          lastName,
          address1,
          address2,
          city,
          province,
          postalCode,
          countryCode,
          phone,
          isDefault: isDefault || false,
        },
      })

      return res.status(201).json({ address })
    } catch (error) {
      next(error)
    }
  }
)

// PUT /customers/me/addresses/:id
router.put(
  '/me/addresses/:id',
  [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
    body('address1').optional().trim().notEmpty(),
    body('city').optional().trim().notEmpty(),
    body('province').optional().trim().notEmpty(),
    body('postalCode').optional().trim().notEmpty(),
    body('countryCode').optional().trim().notEmpty(),
    body('phone').optional().trim(),
    body('isDefault').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() })
      }

      const existing = await prisma.address.findFirst({
        where: { id: req.params.id, customerId: req.customer.id },
      })

      if (!existing) {
        return res.status(404).json({ message: 'Address not found' })
      }

      const { firstName, lastName, address1, address2, city, province, postalCode, countryCode, phone, isDefault } = req.body
      const updateData = {}

      if (firstName !== undefined) updateData.firstName = firstName
      if (lastName !== undefined) updateData.lastName = lastName
      if (address1 !== undefined) updateData.address1 = address1
      if (address2 !== undefined) updateData.address2 = address2
      if (city !== undefined) updateData.city = city
      if (province !== undefined) updateData.province = province
      if (postalCode !== undefined) updateData.postalCode = postalCode
      if (countryCode !== undefined) updateData.countryCode = countryCode
      if (phone !== undefined) updateData.phone = phone

      if (isDefault === true) {
        await prisma.address.updateMany({
          where: { customerId: req.customer.id, isDefault: true },
          data: { isDefault: false },
        })
        updateData.isDefault = true
      } else if (isDefault === false) {
        updateData.isDefault = false
      }

      const address = await prisma.address.update({
        where: { id: req.params.id },
        data: updateData,
      })

      return res.json({ address })
    } catch (error) {
      next(error)
    }
  }
)

// DELETE /customers/me/addresses/:id
router.delete('/me/addresses/:id', async (req, res, next) => {
  try {
    const existing = await prisma.address.findFirst({
      where: { id: req.params.id, customerId: req.customer.id },
    })

    if (!existing) {
      return res.status(404).json({ message: 'Address not found' })
    }

    await prisma.address.delete({ where: { id: req.params.id } })

    return res.json({ message: 'Address deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// GET /customers/me/orders
router.get('/me/orders', async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: req.customer.id },
      include: {
        items: {
          include: {
            variant: {
              include: { product: { select: { title: true, thumbnail: true } } },
            },
          },
        },
        shippingOption: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.json({ orders })
  } catch (error) {
    next(error)
  }
})

module.exports = router
