const express = require('express')
const { body, validationResult } = require('express-validator')
const prisma = require('../../lib/prisma')
const adminAuth = require('../../middleware/adminAuth')

const router = express.Router()

// All routes require admin auth
router.use(adminAuth)

// GET /admin/products
router.get('/', async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, status, q } = req.query

    const where = {}
    if (status) where.status = status
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
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

    return res.json({ products, count, limit: parseInt(limit), offset: parseInt(offset) })
  } catch (error) {
    next(error)
  }
})

// POST /admin/products
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('handle').trim().notEmpty().withMessage('Handle is required'),
    body('status').optional().isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
    body('variants').optional().isArray(),
    body('variants.*.title').optional().notEmpty(),
    body('variants.*.price').optional().isFloat({ min: 0 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() })
      }

      const {
        title,
        handle,
        description,
        status = 'DRAFT',
        thumbnail,
        categoryId,
        collectionId,
        tags = [],
        variants = [],
        images = [],
      } = req.body

      const product = await prisma.product.create({
        data: {
          title,
          handle,
          description,
          status,
          thumbnail,
          categoryId: categoryId || null,
          collectionId: collectionId || null,
          tags,
          variants: {
            create: variants.map((v) => ({
              title: v.title,
              sku: v.sku || null,
              price: v.price || 0,
              compareAtPrice: v.compareAtPrice || null,
              inventory: v.inventory || 0,
              options: v.options || {},
            })),
          },
          images: {
            create: images.map((img, idx) => ({
              url: img.url,
              alt: img.alt || null,
              position: img.position !== undefined ? img.position : idx,
            })),
          },
        },
        include: {
          variants: true,
          images: { orderBy: { position: 'asc' } },
          category: true,
          collection: true,
        },
      })

      return res.status(201).json({ product })
    } catch (error) {
      next(error)
    }
  }
)

// GET /admin/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        variants: true,
        images: { orderBy: { position: 'asc' } },
        category: true,
        collection: true,
      },
    })

    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    return res.json({ product })
  } catch (error) {
    next(error)
  }
})

// PUT /admin/products/:id
router.put('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Product not found' })

    const { title, handle, description, status, thumbnail, categoryId, collectionId, tags } = req.body
    const updateData = {}

    if (title !== undefined) updateData.title = title
    if (handle !== undefined) updateData.handle = handle
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail
    if (categoryId !== undefined) updateData.categoryId = categoryId || null
    if (collectionId !== undefined) updateData.collectionId = collectionId || null
    if (tags !== undefined) updateData.tags = tags

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        variants: true,
        images: { orderBy: { position: 'asc' } },
        category: true,
        collection: true,
      },
    })

    return res.json({ product })
  } catch (error) {
    next(error)
  }
})

// DELETE /admin/products/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Product not found' })

    await prisma.product.delete({ where: { id: req.params.id } })

    return res.json({ message: 'Product deleted successfully' })
  } catch (error) {
    next(error)
  }
})

// POST /admin/products/:id/variants
router.post(
  '/:id/variants',
  [
    body('title').trim().notEmpty().withMessage('Variant title is required'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: 'Validation error', errors: errors.array() })
      }

      const product = await prisma.product.findUnique({ where: { id: req.params.id } })
      if (!product) return res.status(404).json({ message: 'Product not found' })

      const { title, sku, price, compareAtPrice, inventory = 0, options = {} } = req.body

      const variant = await prisma.productVariant.create({
        data: {
          productId: req.params.id,
          title,
          sku: sku || null,
          price,
          compareAtPrice: compareAtPrice || null,
          inventory,
          options,
        },
      })

      return res.status(201).json({ variant })
    } catch (error) {
      next(error)
    }
  }
)

// PUT /admin/products/:id/variants/:variantId
router.put('/:id/variants/:variantId', async (req, res, next) => {
  try {
    const variant = await prisma.productVariant.findFirst({
      where: { id: req.params.variantId, productId: req.params.id },
    })
    if (!variant) return res.status(404).json({ message: 'Variant not found' })

    const { title, sku, price, compareAtPrice, inventory, options } = req.body
    const updateData = {}

    if (title !== undefined) updateData.title = title
    if (sku !== undefined) updateData.sku = sku || null
    if (price !== undefined) updateData.price = price
    if (compareAtPrice !== undefined) updateData.compareAtPrice = compareAtPrice || null
    if (inventory !== undefined) updateData.inventory = inventory
    if (options !== undefined) updateData.options = options

    const updatedVariant = await prisma.productVariant.update({
      where: { id: req.params.variantId },
      data: updateData,
    })

    return res.json({ variant: updatedVariant })
  } catch (error) {
    next(error)
  }
})

module.exports = router
