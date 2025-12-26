-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "passwordHash" TEXT;

-- CreateIndex
CREATE INDEX "Reserva_status_idx" ON "Reserva"("status");

-- CreateIndex
CREATE INDEX "Reserva_courtId_idx" ON "Reserva"("courtId");

-- CreateIndex
CREATE INDEX "Reserva_startTime_idx" ON "Reserva"("startTime");
