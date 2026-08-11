// Apply SMS migration using Prisma client
process.chdir(__dirname);

// Set env before requiring @prisma/client
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Applying SMS migration...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SmsConversation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "contactId" TEXT NOT NULL,
      "teamId" TEXT NOT NULL,
      "lastMessage" TEXT,
      "lastAt" DATETIME,
      "unreadCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
  console.log('✓ SmsConversation table created');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SmsMessage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "conversationId" TEXT NOT NULL,
      "direction" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'SENT',
      "ringoverSmsId" TEXT,
      "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("conversationId") REFERENCES "SmsConversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
  console.log('✓ SmsMessage table created');

  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "SmsConversation_contactId_teamId_key" ON "SmsConversation"("contactId", "teamId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SmsConversation_teamId_lastAt_idx" ON "SmsConversation"("teamId", "lastAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SmsMessage_conversationId_sentAt_idx" ON "SmsMessage"("conversationId", "sentAt")`);
  console.log('✓ Indexes created');

  // Verify
  const tables = await prisma.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('SmsConversation','SmsMessage')`
  );
  console.log('✓ Tables verified:', tables.map(t => t.name).join(', '));
  console.log('\nMigration completed successfully!');
}

main()
  .catch(e => { console.error('Migration error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());

