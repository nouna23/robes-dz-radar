/*
  Warnings:

  - The `aiRelevance` column on the `Signal` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Signal" DROP COLUMN "aiRelevance",
ADD COLUMN     "aiRelevance" BOOLEAN;
