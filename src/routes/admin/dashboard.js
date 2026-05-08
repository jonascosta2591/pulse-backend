const express = require('express')
const prisma = require('../../lib/prisma')
const adminAuth = require('../../middleware/adminAuth')

const router = express.Router()

// GET /admin/dashboard
router.get('/', adminAuth, async (req, res, next) => {
  try {
    const [
      totalOrders,
      totalCustomers,
      totalProducts,
      revenueResult,
      recentOrders,
      ordersByStatus,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.customer.count(),
      prisma.product.count({ where: { status: 'PUBLISHED' } }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { paymentStatus: 'CAPTURED' },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
        },
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ])

    const revenue = revenueResult._sum.total || 0

    return res.json({
      stats: {
        totalOrders,
        totalCustomers,
        totalProducts,
        revenue: parseFloat(revenue.toFixed(2)),
      },
      recentOrders,
      ordersByStatus: ordersByStatus.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
