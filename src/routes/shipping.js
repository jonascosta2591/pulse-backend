const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

// GET /shipping-options?region_id=xxx
router.get('/', async (req, res, next) => {
  try {
    const { region_id } = req.query

    const where = {}
    if (region_id) where.regionId = region_id

    const shippingOptions = await prisma.shippingOption.findMany({
      where,
      include: {
        region: { select: { id: true, name: true, currencyCode: true } },
      },
      orderBy: { price: 'asc' },
    })

    return res.json({ shipping_options: shippingOptions })
  } catch (error) {
    next(error)
  }
})

module.exports = router
