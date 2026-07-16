-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "tags" TEXT,
    "notes" TEXT,
    "ownerId" TEXT,
    "teamId" TEXT NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contact_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Contact_teamId_name_idx" ON "Contact"("teamId", "name");

-- CreateIndex
CREATE INDEX "Contact_teamId_phone_idx" ON "Contact"("teamId", "phone");

-- CreateIndex
CREATE INDEX "Contact_teamId_email_idx" ON "Contact"("teamId", "email");
