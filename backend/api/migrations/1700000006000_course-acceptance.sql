-- Up Migration
-- Relie les réservations parents à l'espace prof : une réservation (`courses`)
-- est désormais « en attente » (accepted=FALSE) jusqu'à ce que le professeur la
-- valide. Les cours déjà seedés restent acceptés (DEFAULT TRUE), pour ne pas
-- transformer l'historique de démo en demandes en attente.

ALTER TABLE courses ADD COLUMN accepted BOOLEAN NOT NULL DEFAULT TRUE;

-- Down Migration
ALTER TABLE courses DROP COLUMN IF EXISTS accepted;
