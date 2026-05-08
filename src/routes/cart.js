const express = require('express')
const { body, validationResult } = require('express-validator')
const prisma = require('../lib/prisma')

const router = express.Router()

/**
 * Calculate cart totals
 */
function calculateTotals(cart, shippingOption = null) {
  const subtotal = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const shippingTotal = shippingOption ? shippingOption.price : 0
  const discountTotal = 0 // Discount logic can be extended
  const taxRate = cart.region ? cart.region.taxRate : 0
  const taxTotal = (subtotal + shippingTotal) * taxRate
  const total = subtotal + shippingTotal + taxTotal - discountTotal

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    shippingTotal: parseFloat(shippingTotal.toFixed(2)),
    taxTotal: parseFloat(taxTotal.toFixed(2)),
    discountTotal: parseFloat(discountTotal.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  }
}

/**
 * Fetch full cart with all relations
 */
async function getFullCart(cartId) {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      region: true,
      items: {
        include: {
          variant: {
            include: {
              product: {
                select: { id: true, title: true, handle: true, thumbnail: true },
              },
            },
          },
        },
      },
    },
  })
}

// POST /carts
router.post(
  '/',
  [
    body('regionId').notEmpty().withMessage('regionId is required'),
    body('customerId').optional().isString(),
    body('email').optional().isEmail(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() })
      }

      const { regionId, customerId, email } = req.body

      const region = await prisma.region.findUnique({ where: { id: regionId } })
      if (!region) {
        return res.status(404).json({ message: 'Region not found' })
      }

      const cart = await prisma.cart.create({
        data: {
          regionId,
          customerId: customerId || null,
          email: email || null,
          status: 'ACTIVE',
        },
      })

      const fullCart = await getFullCart(cart.id)
      const totals = calculateTotals(fullCart)

      return res.status(201).json({ cart: { ...fullCart, ...totals } })
    } catch (error) {
      next(error)
    }
  }
)

// GET /carts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const cart = await getFullCart(req.params.id)

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' })
    }

    const totals = calculateTotals(cart)

    return res.json({ cart: { ...cart, ...totals } })
  } catch (error) {
    next(error)
  }
})

// POST /carts/:id/line-items
router.post(
  '/:id/line-items',
  [
    body('variantId').notEmpty().withMessage('variantId is required'),
    body('quantity').isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() })
      }

      const cart = await prisma.cart.findUnique({ where: { id: req.params.id } })
      if (!cart) return res.status(404).json({ message: 'Cart not found' })
      if (cart.status !== 'ACTIVE') return res.status(400).json({ message: 'Cart is not active' })

      const { variantId, quantity } = req.body

      const variant = await prisma.productVariant.findUnique({ where: { id: variantId } })
      if (!variant) return res.status(404).json({ message: 'Product variant not found' })

      if (variant.inventory < quantity) {
        return res.status(400).json({ message: 'Insufficient inventory' })
      }

      // Check if item already exists in cart
      const existingItem = await prisma.cartItem.findFirst({
        where: { cartId: req.params.id, variantId },
      })

      let item
      if (existingItem) {
        item = await prisma.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity },
        })
      } else {
        item = await prisma.cartItem.create({
          data: {
            cartId: req.params.id,
            variantId,
            quantity,
            unitPrice: variant.price,
          },
        })
      }

      // Update cart updatedAt
      await prisma.cart.update({ where: { id: req.params.id }, data: {} })

      const fullCart = await getFullCart(req.params.id)
      const totals = calculateTotals(fullCart)

      return res.status(201).json({ cart: { ...fullCart, ...totals } })
    } catch (error) {
      next(error)
    }
  }
)

// PUT /carts/:id/line-items/:itemId
router.put(
  '/:id/line-items/:itemId',
  [body('quantity').isInt({ min: 0 }).withMessage('quantity must be a non-negative integer')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() })
      }

      const cart = await prisma.cart.findUnique({ where: { id: req.params.id } })
      if (!cart) return res.status(404).json({ message: 'Cart not found' })
      if (cart.status !== 'ACTIVE') return res.status(400).json({ message: 'Cart is not active' })

      const item = await prisma.cartItem.findFirst({
        where: { id: req.params.itemId, cartId: req.params.id },
      })
      if (!item) return res.status(404).json({ message: 'Cart item not found' })

      const { quantity } = req.body

      if (quantity === 0) {
        await prisma.cartItem.delete({ where: { id: req.params.itemId } })
      } else {
        await prisma.cartItem.update({
          where: { id: req.params.itemId },
          data: { quantity },
        })
      }

      const fullCart = await getFullCart(req.params.id)
      const totals = calculateTotals(fullCart)

      return res.json({ cart: { ...fullCart, ...totals } })
    } catch (error) {
      next(error)
    }
  }
)

// DELETE /carts/:id/line-items/:itemId
router.delete('/:id/line-items/:itemId', async (req, res, next) => {
  try {
    const cart = await prisma.cart.findUnique({ where: { id: req.params.id } })
    if (!cart) return res.status(404).json({ message: 'Cart not found' })
    if (cart.status !== 'ACTIVE') return res.status(400).json({ message: 'Cart is not active' })

    const item = await prisma.cartItem.findFirst({
      where: { id: req.params.itemId, cartId: req.params.id },
    })
    if (!item) return res.status(404).json({ message: 'Cart item not found' })

    await prisma.cartItem.delete({ where: { id: req.params.itemId } })

    const fullCart = await getFullCart(req.params.id)
    const totals = calculateTotals(fullCart)

    return res.json({ cart: { ...fullCart, ...totals } })
  } catch (error) {
    next(error)
  }
})

// POST /carts/:id/shipping-address
router.post(
  '/:id/shipping-address',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('address1').trim().notEmpty().withMessage('Address line 1 is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('province').trim().notEmpty().withMessage('Province is required'),
    body('postalCode').trim().notEmpty().withMessage('Postal code is required'),
    body('countryCode').trim().notEmpty().withMessage('Country code is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() })
      }

      const cart = await prisma.cart.findUnique({ where: { id: req.params.id } })
      if (!cart) return res.status(404).json({ message: 'Cart not found' })

      // Store shipping address as JSON in a dedicated field
      // We store the address data directly on the cart as a JSON string in shippingAddressId
      // For a full implementation, you'd store in a separate table
      const addressData = JSON.stringify(req.body)

      const updatedCart = await prisma.cart.update({
        where: { id: req.params.id },
        data: { shippingAddressId: addressData },
      })

      const fullCart = await getFullCart(req.params.id)
      const totals = calculateTotals(fullCart)

      return res.json({ cart: { ...fullCart, ...totals } })
    } catch (error) {
      next(error)
    }
  }
)

// POST /carts/:id/billing-address
router.post(
  '/:id/billing-address',
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('address1').trim().notEmpty().withMessage('Address line 1 is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('province').trim().notEmpty().withMessage('Province is required'),
    body('postalCode').trim().notEmpty().withMessage('Postal code is required'),
    body('countryCode').trim().notEmpty().withMessage('Country code is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() })
      }

      const cart = await prisma.cart.findUnique({ where: { id: req.params.id } })
      if (!cart) return res.status(404).json({ message: 'Cart not found' })

      const addressData = JSON.stringify(req.body)

      await prisma.cart.update({
        where: { id: req.params.id },
        data: { billingAddressId: addressData },
      })

      const fullCart = await getFullCart(req.params.id)
      const totals = calculateTotals(fullCart)

      return res.json({ cart: { ...fullCart, ...totals } })
    } catch (error) {
      next(error)
    }
  }
)

// POST /carts/:id/complete
router.post('/:id/complete', async (req, res, next) => {
  try {
    const cart = await getFullCart(req.params.id)
    if (!cart) return res.status(404).json({ message: 'Cart not found' })
    if (cart.status !== 'ACTIVE') return res.status(400).json({ message: 'Cart is already completed or abandoned' })
    if (!cart.items || cart.items.length === 0) return res.status(400).json({ message: 'Cart is empty' })

    const email = cart.email || (cart.customer ? cart.customer.email : null)
    if (!email) return res.status(400).json({ message: 'Email is required to complete the order' })

    // Get shipping option if set
    let shippingOption = null
    if (req.body.shippingOptionId) {
      shippingOption = await prisma.shippingOption.findUnique({
        where: { id: req.body.shippingOptionId },
      })
    }

    const totals = calculateTotals(cart, shippingOption)

    // Create order items from cart items
    const orderItems = cart.items.map((item) => ({
      variantId: item.variantId,
      title: item.variant.product.title,
      variantTitle: item.variant.title,
      thumbnail: item.variant.product.thumbnail,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: parseFloat((item.unitPrice * item.quantity).toFixed(2)),
    }))

    // Create the order
    const order = await prisma.order.create({
      data: {
        customerId: cart.customerId || null,
        email,
        status: 'PENDING',
        paymentStatus: 'AWAITING',
        total: totals.total,
        subtotal: totals.subtotal,
        shippingTotal: totals.shippingTotal,
        taxTotal: totals.taxTotal,
        discountTotal: totals.discountTotal,
        currencyCode: cart.region.currencyCode,
        shippingAddressId: cart.shippingAddressId,
        billingAddressId: cart.billingAddressId,
        shippingOptionId: shippingOption ? shippingOption.id : null,
        items: { create: orderItems },
      },
      include: {
        items: true,
        shippingOption: true,
      },
    })

    // Decrement inventory for each variant
    for (const item of cart.items) {
      await prisma.productVariant.update({
        where: { id: item.variantId },
        data: { inventory: { decrement: item.quantity } },
      })
    }

    // Mark cart as completed
    await prisma.cart.update({
      where: { id: cart.id },
      data: { status: 'COMPLETED' },
    })

    return res.status(201).json({ order, type: 'order' })
  } catch (error) {
    next(error)
  }
})

module.exports = router
