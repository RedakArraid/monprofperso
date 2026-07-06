-- Paiements Paystack Mobile Money + statut de paiement sur les cours.

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'paid';

-- Historique seed : déjà considéré comme payé (DEFAULT paid ci-dessus).

CREATE TABLE payments (
  id                 SERIAL PRIMARY KEY,
  user_id            INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id          INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  amount             INT NOT NULL,
  provider           TEXT NOT NULL,
  phone              TEXT NOT NULL,
  paystack_reference TEXT UNIQUE,
  status             TEXT NOT NULL DEFAULT 'pending',
  provider_response  JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payments_course_id_idx ON payments(course_id);
CREATE INDEX payments_user_id_idx ON payments(user_id);
CREATE INDEX payments_status_idx ON payments(status);
