const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

// GET /regions
router.get('/', async (req, res, next) => {
  try {
    const regions = await prisma.region.findMany({
      orderBy: { name: 'asc' },
    })
    return res.json({ regions })
  } catch (error) {
    next(error)
  }
})

// GET /regions/:id
router.get('/:id', async (req, res, next) => {
  try {
    const region = await prisma.region.findUnique({
      where: { id: req.params.id },
      include: {
        shippingOptions: true,
      },
    })

    if (!region) {
      return res.status(404).json({ message: 'Region not found' })
    }

    return res.json({ region })
  } catch (error) {
    next(error)
  }
})

module.exports = router
