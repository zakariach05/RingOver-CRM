const path = require('path')

/**
 * jest.env.js — setupFiles
 * Runs in EACH Jest worker process BEFORE any module imports.
 */
process.env.NODE_ENV = 'test'
// Use absolute path to avoid SQLite "Unable to open database file" errors
const dbPath = path.join(__dirname, 'prisma', 'test.db')
// Prisma requires triple slash for absolute file paths on windows if there is a drive letter,
// but path.join might give C:\... so we prepend file: to it
process.env.DATABASE_URL = `file:${dbPath}`
process.env.JWT_SECRET = 'test-secret-key'
process.env.FRONTEND_URL = 'http://localhost:5173'
process.env.WEBHOOK_SECRET = 'test-webhook-secret'

