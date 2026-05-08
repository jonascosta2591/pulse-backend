require('dotenv').config()

const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const morgan = require('morgan')
const path = require('path')

const errorHandler = require('./middleware/errorHandler')

// Route imports
const authRouter = require('./routes/auth')
const customersRouter = require('./routes/customers')
const productsRouter = require('./routes/products')
const categoriesRouter = require('./routes/categories')
const collectionsRouter = require('./routes/collections')
const regionsRouter = require('./routes/regions')
const cartRouter = require('./routes/cart')
const ordersRouter = require('./routes/orders')
const shippingRouter = require('./routes/shipping')
const adminRouter = require('./routes/admin/index')

const app = express()

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // disabled to allow inline scripts in admin panel
}))

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (ex: painel servido pelo próprio backend)
      if (!origin) return callback(null, true)
      const allowed = [
        process.env.STORE_CORS || 'http://localhost:3000',
        process.env.ADMIN_CORS || 'http://localhost:3001',
        `http://localhost:${process.env.PORT || 9000}`,
      ]
      if (allowed.includes(origin)) return callback(null, true)
      callback(null, true) // permissivo em dev; troque por callback(new Error('Not allowed')) em prod
    },
    credentials: true,
  })
)

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Cookie parsing
app.use(cookieParser())

// HTTP request logging (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// ─── Admin Panel (SPA estática) ───────────────────────────────────────────────
// Serve os arquivos estáticos (style.css, app.js, etc.)
app.use('/admin-panel', express.static(path.join(__dirname, 'admin')))
// Qualquer rota dentro de /admin-panel retorna o index.html (client-side routing)
app.get('/admin-panel', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')))
app.get('/admin-panel/*', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'PULSE Backend', timestamp: new Date().toISOString() })
})

// Store routes (public + customer-authenticated)
app.use('/store/auth', authRouter)
app.use('/store/customers', customersRouter)
app.use('/store/products', productsRouter)
app.use('/store/categories', categoriesRouter)
app.use('/store/collections', collectionsRouter)
app.use('/store/regions', regionsRouter)
app.use('/store/carts', cartRouter)
app.use('/store/orders', ordersRouter)
app.use('/store/shipping-options', shippingRouter)

// Admin routes
app.use('/admin', adminRouter)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` })
})

// Global error handler (must be last)
app.use(errorHandler)

module.exports = app
