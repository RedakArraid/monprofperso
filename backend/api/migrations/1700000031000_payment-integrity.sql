-- Horodatage réel des réservations et écriture comptable idempotente.
ALTER TABLE courses ADD COLUMN starts_at TIMESTAMPTZ;
ALTER TABLE courses ADD COLUMN duration_minutes INT CHECK (duration_minutes BETWEEN 15 AND 1440);
ALTER TABLE transactions ADD COLUMN payment_id INT REFERENCES payments(id);
-- Un rejeu de webhook historique ne doit pas recréer une dépense non reliée.
ALTER TABLE payments ADD COLUMN integrity_version SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE payments ALTER COLUMN integrity_version SET DEFAULT 2;
ALTER TABLE payments ADD COLUMN checked_at TIMESTAMPTZ;
CREATE UNIQUE INDEX transactions_payment_id_unique ON transactions(payment_id);
CREATE INDEX courses_teacher_schedule ON courses(teacher_id, starts_at)
  WHERE status='upcoming' AND starts_at IS NOT NULL;
