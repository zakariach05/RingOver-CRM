const { execSync } = require('child_process');
const path = require('path');

process.chdir(path.join(__dirname));

try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', cwd: __dirname });
  execSync('npx prisma generate', { stdio: 'inherit', cwd: __dirname });
  console.log('Prisma migration applied successfully');
} catch (e) {
  console.error('Migration failed:', e.message);
  process.exit(1);
}
