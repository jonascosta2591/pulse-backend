const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

// GET /categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    })
    return res.json({ categories })
  } catch (error) {
    next(error)
  }
})

// GET /categories/:handle
router.get('/:handle', async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { handle: req.params.handle },
    })

    if (!category) {
      return res.status(404).json({ message: 'Category not found' })
    }

    return res.json({ category })
  } catch (error) {
    next(error)
  }
})

module.exports = router
