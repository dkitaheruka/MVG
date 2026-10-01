import express from 'express'
import cors from 'cors'
import { createServer as createViteServer } from 'vite'
import path from 'path'
import apiRouter from './server/routes'

async function startServer() {
  const app = express()
  const port = parseInt(process.env.PORT || '3000', 10)
  const isProduction = process.env.NODE_ENV === 'production'

  app.use(cors())
  app.use(express.json())

  // API router
  app.use('/api', apiRouter)

  if (!isProduction) {
    // Vite middleware for dev mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  } else {
    // Serve production build
    const distPath = path.resolve(__dirname, 'dist')
    app.use(express.static(distPath))
    app.get('*', (_req, res) => {
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
