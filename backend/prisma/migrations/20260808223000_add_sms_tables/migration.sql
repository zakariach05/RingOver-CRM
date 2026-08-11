-- CreateTable: SmsConversation
CREATE TABLE "SmsConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "lastMessage" TEXT,
    "lastAt" DATETIME,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SmsConversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SmsConversation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable: SmsMessage
CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "ringoverSmsId" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmsMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SmsConversation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SmsConversation_contactId_teamId_key" ON "SmsConversation"("contactId", "teamId");

-- CreateIndex
CREATE INDEX "SmsConversation_teamId_lastAt_idx" ON "SmsConversation"("teamId", "lastAt");

-- CreateIndex
CREATE INDEX "SmsMessage_conversationId_sentAt_idx" ON "SmsMessage"("conversationId", "sentAt");
