require('dotenv').config()

const app = require('./app')
const prisma = require('./lib/prisma')

const PORT = process.env.PORT || 9000

async function main() {
  try {
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    app.listen(PORT, () => {
      console.log(`🚀 PULSE Backend running on http://localhost:${PORT}`)
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`🏪 Store API: http://localhost:${PORT}/store`)
      console.log(`🔧 Admin API: http://localhost:${PORT}/admin`)
      console.log(`❤️  Health: http://localhost:${PORT}/health`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

main()
