/*
  Warnings:

  - Added the required column `userId` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add userId column as nullable first
ALTER TABLE "Notification" ADD COLUMN "userId" TEXT;

-- Step 2: Assign all existing notifications to the first user
-- (This assumes at least one user exists; adjust as needed)
UPDATE "Notification" 
SET "userId" = (SELECT "id" FROM "User" LIMIT 1)
WHERE "userId" IS NULL;

-- Step 3: Make the column NOT NULL
ALTER TABLE "Notification" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
