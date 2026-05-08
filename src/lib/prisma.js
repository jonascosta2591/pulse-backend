const { PrismaClient } = require('@prisma/client')

const clientOptions = {
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  errorFormat: 'minimal',
}

let prisma

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(clientOptions)
} else {
  // Reutiliza instância em dev para evitar múltiplas conexões com hot-reload
  if (!global.__prisma) {
    global.__prisma = new PrismaClient(clientOptions)
  }
  prisma = global.__prisma
}

// Reconecta automaticamente em caso de queda
async function withRetry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      const isConnectionError =
        err.code === 'P1001' || // Can't reach database
        err.code === 'P1002' || // Timeout
        err.code === 'P1008' || // Operations timed out
        err.message?.includes("Can't reach database")

      if (isConnectionError && i < retries - 1) {
        console.warn(`[Prisma] Conexão falhou (tentativa ${i + 1}/${retries}). Reconectando em ${delay}ms...`)
        await prisma.$disconnect().catch(() => {})
        await new Promise(r => setTimeout(r, delay))
        await prisma.$connect().catch(() => {})
        delay *= 2 // backoff exponencial
        continue
      }
      throw err
    }
  }
}

// Proxy que intercepta todas as chamadas ao Prisma e aplica retry automático
const prismaWithRetry = new Proxy(prisma, {
  get(target, prop) {
    const value = target[prop]
    // Só intercepta os models (objetos com métodos como findUnique, create, etc.)
    if (
      value &&
      typeof value === 'object' &&
      !prop.startsWith('$') &&
      !prop.startsWith('_')
    ) {
      return new Proxy(value, {
        get(modelTarget, method) {
          const fn = modelTarget[method]
          if (typeof fn === 'function') {
            return (...args) => withRetry(() => fn.apply(modelTarget, args))
          }
          return fn
        },
      })
    }
    return value
  },
})

module.exports = prismaWithRetry
