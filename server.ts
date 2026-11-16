import express from 'express'
import cors from 'cors'
import path from 'path'
import apiRouter from './server/routes.ts'
import { checkPersistenceHealth, closePersistence, initializePersistence, persistenceMiddleware } from './server/persistence.ts'

async function startServer() {
  const app = express()
  const port = parseInt(process.env.PORT || '3000', 10)
  const isProduction = process.env.NODE_ENV === 'production'

  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  if (corsOrigins.some((origin) => !/^https:\/\//i.test(origin))) {
    throw new Error('Every production CORS_ORIGINS entry must use HTTPS.')
  }

  await initializePersistence()

  if (isProduction && process.env.TRUST_PROXY === '1') app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()')
    if (isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    next()
  })
  app.use(cors({ origin: isProduction ? corsOrigins : true, credentials: true }))
  const requestBodyLimit = isProduction ? (process.env.REQUEST_BODY_LIMIT || '10mb') : '50mb'
  app.use(express.json({ limit: requestBodyLimit }))
  app.use(express.urlencoded({ limit: requestBodyLimit, extended: true }))

  app.get('/healthz', (_req, res) => res.status(200).json({ status: 'ok' }))
  app.get('/readyz', async (_req, res) => {
    try {
      const health = await checkPersistenceHealth()
      res.status(health.ready ? 200 : 503).json(health)
    } catch {
      res.status(503).json({ ready: false, database: 'unavailable' })
    }
  })

  const loginAttempts = new Map<string, { count: number; resetAt: number }>()
  app.use('/api/auth/login', (req, res, next) => {
    if (!isProduction) return next()
    const now = Date.now()
    const key = req.ip || req.socket.remoteAddress || 'unknown'
    for (const [ip, attempt] of loginAttempts) {
      if (attempt.resetAt <= now) loginAttempts.delete(ip)
    }
    const attempt = loginAttempts.get(key)
    if (attempt && attempt.resetAt > now && attempt.count >= 20) {
      res.setHeader('Retry-After', String(Math.ceil((attempt.resetAt - now) / 1000)))
      return res.status(429).json({ message: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' })
    }
    if (!attempt || attempt.resetAt <= now) loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 })
    else attempt.count += 1
    next()
  })

  // API router
  app.use('/api', persistenceMiddleware)
  app.use('/api', apiRouter)

  // Error handling middleware for oversized payloads or malformed JSON
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      return res.status(413).json({
        message: `La charge utile dépasse la limite configurée (${requestBodyLimit}).`,
      })
    }
    if (err && (err.type === 'entity.parse.failed' || err.status === 400)) {
      return res.status(400).json({ message: 'Le corps de la requête contient un JSON invalide.' })
    }
    next(err)
  })

  // Route d'accès direct au Dossier de Présentation Exécutif (Marque Blanche / Sans nom d'entreprise)
  app.get(['/dossier', '/dossier.html', '/presentation'], (_req, res) => {
    res.sendFile(path.resolve(process.cwd(), 'public/dossier.html'))
  })

  if (!isProduction) {
    // Vite middleware for dev mode (dynamic import so vite is not required in production)
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  } else {
    // Serve production build
    const distPath = path.resolve(process.cwd(), 'dist')
    app.use(express.static(distPath))
    app.use((_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'))
    })
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Matabishi ERP server running on port ${port}`)
  })

  const shutdown = () => {
    server.close(() => {
      void closePersistence().finally(() => process.exit(0))
    })
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
