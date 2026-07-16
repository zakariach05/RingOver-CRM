const { execSync } = require('child_process')
const path = require('path')

module.exports = async () => {
  // These env vars are set here for the globalSetup process (schema push).
  // For test workers, jest.env.js (setupFiles) sets them independently.
  process.env.NODE_ENV = 'test'
  
  const backendDir = path.join(__dirname)
  const dbPath = path.join(backendDir, 'prisma', 'test.db')
  const dbUrl = `file:${dbPath}`
  
  process.env.DATABASE_URL = dbUrl
  process.env.JWT_SECRET = 'test-secret-key'
  process.env.FRONTEND_URL = 'http://localhost:5173'

  // Push schema to test database (creates/updates tables without migration history)
  execSync('node ./node_modules/prisma/build/index.js db push --skip-generate --force-reset', {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: dbUrl },
    stdio: 'inherit',
  })
}
