const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

// GET /collections
router.get('/', async (req, res, next) => {
  try {
    const collections = await prisma.collection.findMany({
      orderBy: { name: 'asc' },
    })
    return res.json({ collections })
  } catch (error) {
    next(error)
  }
})

// GET /collections/:handle
router.get('/:handle', async (req, res, next) => {
  try {
    const collection = await prisma.collection.findUnique({
      where: { handle: req.params.handle },
    })

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' })
    }

    return res.json({ collection })
  } catch (error) {
    next(error)
  }
})

module.exports = router
