import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import teamRoutes from './routes/team'
import contactsRoutes from './routes/contacts'

// Load .env only outside of test env.
// In tests, jest.env.js (setupFiles) already sets the required vars BEFORE
// this module is imported, and dotenv.config() would load dev.db from .env.
if (process.env.NODE_ENV !== 'test') {
  dotenv.config()
}

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/team', teamRoutes)
app.use('/contacts', contactsRoutes)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

export default app
