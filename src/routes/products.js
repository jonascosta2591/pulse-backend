const express = require('express')
const prisma = require('../lib/prisma')

const router = express.Router()

// GET /products
router.get('/', async (req, res, next) => {
  try {
    const {
      limit = 20,
      offset = 0,
      category_id,
      collection_id,
      q,
      id,
    } = req.query

    const where = {
      status: 'PUBLISHED',
    }

    // Support filtering by one or more IDs: ?id=abc or ?id=abc&id=def
    if (id) {
      const ids = Array.isArray(id) ? id : [id]
      where.id = { in: ids }
      // When fetching by ID, don't restrict to PUBLISHED only
      delete where.status
    }

    if (category_id) where.categoryId = category_id
    if (collection_id) where.collectionId = collection_id
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { has: q } },
      ]
    }

    const [products, count] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variants: true,
          images: { orderBy: { position: 'asc' } },
          category: { select: { id: true, name: true, handle: true } },
          collection: { select: { id: true, name: true, handle: true } },
        },
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ])

    return res.json({
      products,
      count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    })
  } catch (error) {
    next(error)
  }
})

// GET /products/:handle
router.get('/:handle', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { handle: req.params.handle },
      include: {
        variants: { orderBy: { createdAt: 'asc' } },
        images: { orderBy: { position: 'asc' } },
        category: { select: { id: true, name: true, handle: true } },
        collection: { select: { id: true, name: true, handle: true } },
      },
    })

    if (!product || product.status !== 'PUBLISHED') {
      return res.status(404).json({ message: 'Product not found' })
    }

    return res.json({ product })
  } catch (error) {
    next(error)
  }
})

module.exports = router
