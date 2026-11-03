import express from 'express'
import cors from 'cors'
import path from 'path'
import apiRouter from './server/routes.ts'

async function startServer() {
  const app = express()
  const port = parseInt(process.env.PORT || '3000', 10)
  const isProduction = process.env.NODE_ENV === 'production'

  app.use(cors())
  app.use(express.json({ limit: '50mb' }))
  app.use(express.urlencoded({ limit: '50mb', extended: true }))

  // API router
  app.use('/api', apiRouter)

  // Error handling middleware for oversized payloads or malformed JSON
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      return res.status(413).json({
        message: 'La charge utile ou le fichier envoyé dépasse la taille maximale autorisée (50 Mo).',
      })
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

  app.listen(port, '0.0.0.0', () => {
    console.log(`Matabishi ERP server running on port ${port}`)
  })
}

startServer().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
