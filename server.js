import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'

import routes from './routes/routes.js'
import mongoose from 'mongoose'

const app = express()

// Настройки приложения
app.use(express.json({ limit: '50mb' }))
app.use(cors())

// Роуты приложения
app.use('/api', routes)

app.use(express.static('./dist'))

app.get('/', async (req, res) => {
  const filePath = path.join(process.cwd(), 'dist', 'index.html')

  const file = fs.existsSync(filePath)

  if (!file)
    return res.status(400).json({ message: 'File not found' })

  return res.sendFile(filePath)
})

app.get('*', async (req, res) => res.json({ message: 'Page not found' }))

const startServer = async () => {
  const PORT = process.env.PORT || 80

  await mongoose.connect(process.env.MONGO_TOKEN)

  app.listen(PORT, () => {
    console.log(`Success server has started on port ${PORT}`)
  })
}

startServer()