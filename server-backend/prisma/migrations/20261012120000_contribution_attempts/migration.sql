-- Lets an interrupted paluwagan payment be resolved against the network.
ALTER TABLE "PaluwaganContribution" ADD COLUMN "attemptedAt" TIMESTAMP(3);
