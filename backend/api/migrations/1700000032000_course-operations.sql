-- Cycle des cours, décisions de règlement et preuve des mouvements financiers.
-- Les historiques ne reçoivent ni preuve d'encaissement ni commission inventée.
ALTER TABLE courses
  ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'requested'
    CHECK (lifecycle_status IN ('requested','awaiting_schedule','scheduled','completion_pending','completed','disputed','cancelled','refused')),
  ADD COLUMN private_address TEXT,
  ADD COLUMN meeting_url TEXT,
  ADD COLUMN access_notes TEXT,
  ADD COLUMN commission_pct NUMERIC(5,2) CHECK (commission_pct BETWEEN 0 AND 100),
  ADD COLUMN commission_amount INT CHECK (commission_amount >= 0),
  ADD COLUMN teacher_net_amount INT CHECK (teacher_net_amount >= 0),
  ADD COLUMN completed_at TIMESTAMPTZ,
  ADD COLUMN cancelled_at TIMESTAMPTZ,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD CONSTRAINT courses_financial_snapshot CHECK (
    (commission_pct IS NULL AND commission_amount IS NULL AND teacher_net_amount IS NULL)
    OR (commission_pct IS NOT NULL AND commission_amount IS NOT NULL AND teacher_net_amount IS NOT NULL
        AND commission_amount + teacher_net_amount = price));

UPDATE courses SET lifecycle_status=CASE
  WHEN status='done' THEN 'completed'
  WHEN status='cancelled' THEN 'cancelled'
  WHEN status='refused' THEN 'refused'
  WHEN accepted IS NOT TRUE THEN 'requested'
  WHEN starts_at IS NULL THEN 'awaiting_schedule'
  ELSE 'scheduled' END;

CREATE TABLE course_events (
  id BIGSERIAL PRIMARY KEY,
  course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  actor_id INT REFERENCES users(id),
  actor_role TEXT NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX course_events_course ON course_events(course_id,id);

CREATE TABLE course_schedule_requests (
  id SERIAL PRIMARY KEY,
  course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  proposed_by INT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','superseded')),
  responded_by INT REFERENCES users(id),
  response_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX course_schedule_one_pending ON course_schedule_requests(course_id) WHERE status='pending';

CREATE TABLE course_reports (
  id SERIAL PRIMARY KEY,
  course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  actor_id INT NOT NULL REFERENCES users(id),
  actor_role TEXT NOT NULL CHECK (actor_role IN ('parent','teacher')),
  outcome TEXT NOT NULL CHECK (outcome IN ('completed','teacher_absent','student_absent','disputed')),
  note TEXT NOT NULL,
  progress_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id,actor_role)
);

ALTER TABLE reviews
  ADD COLUMN course_id INT REFERENCES courses(id) ON DELETE SET NULL,
  ADD COLUMN user_id INT REFERENCES users(id),
  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE UNIQUE INDEX review_completed_course_unique ON reviews(course_id) WHERE course_id IS NOT NULL;

ALTER TABLE payments
  ADD COLUMN funds_verified_at TIMESTAMPTZ,
  ADD COLUMN verification_source TEXT CHECK (verification_source IN ('provider','simulation')),
  ADD COLUMN reconcile_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN reconcile_after TIMESTAMPTZ,
  ADD COLUMN reconcile_lease_until TIMESTAMPTZ,
  ADD COLUMN last_reconcile_error TEXT;
CREATE INDEX payments_reconcile_pending ON payments(reconcile_after,id) WHERE status IN ('pending','otp_required');

CREATE TABLE course_settlements (
  course_id INT PRIMARY KEY REFERENCES courses(id),
  teacher_due_amount INT NOT NULL CHECK (teacher_due_amount >= 0),
  release_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT NOT NULL,
  decided_by INT NOT NULL REFERENCES users(id),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE finance_operations (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('refund','payout')),
  course_id INT REFERENCES courses(id),
  payment_id INT REFERENCES payments(id),
  teacher_id INT REFERENCES teachers(id),
  requested_by INT NOT NULL REFERENCES users(id),
  idempotency_key TEXT NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 100),
  amount INT NOT NULL CHECK (amount BETWEEN 1 AND 20000000),
  currency TEXT NOT NULL DEFAULT 'XOF' CHECK (currency='XOF'),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','verified','rejected','reversed')),
  reason TEXT NOT NULL,
  provider TEXT NOT NULL,
  beneficiary_phone TEXT,
  provider_reference TEXT,
  provider_evidence JSONB,
  decided_by INT REFERENCES users(id),
  decision_reason TEXT,
  decided_at TIMESTAMPTZ,
  verified_by INT REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requested_by,kind,idempotency_key),
  CHECK ((kind='refund' AND course_id IS NOT NULL AND payment_id IS NOT NULL AND teacher_id IS NULL)
      OR (kind='payout' AND teacher_id IS NOT NULL AND course_id IS NULL AND payment_id IS NULL)),
  CHECK (status<>'verified' OR (provider_reference IS NOT NULL AND provider_evidence IS NOT NULL AND verified_at IS NOT NULL))
);
CREATE UNIQUE INDEX finance_provider_reference_unique ON finance_operations(kind,provider_reference)
  WHERE provider_reference IS NOT NULL;
CREATE UNIQUE INDEX finance_one_active_refund ON finance_operations(course_id)
  WHERE kind='refund' AND status IN ('requested','approved');

CREATE TABLE finance_payout_allocations (
  operation_id INT NOT NULL REFERENCES finance_operations(id),
  course_id INT NOT NULL REFERENCES courses(id),
  amount INT NOT NULL CHECK (amount > 0),
  PRIMARY KEY(operation_id,course_id)
);
CREATE INDEX finance_payout_course ON finance_payout_allocations(course_id);

CREATE TABLE finance_events (
  id BIGSERIAL PRIMARY KEY,
  operation_id INT REFERENCES finance_operations(id),
  course_id INT REFERENCES courses(id),
  actor_id INT REFERENCES users(id),
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE transactions ADD COLUMN finance_operation_id INT REFERENCES finance_operations(id);
ALTER TABLE transactions ADD COLUMN finance_reversal_id INT REFERENCES finance_operations(id);
CREATE UNIQUE INDEX transactions_finance_operation_unique ON transactions(finance_operation_id)
  WHERE finance_operation_id IS NOT NULL;
CREATE UNIQUE INDEX transactions_finance_reversal_unique ON transactions(finance_reversal_id)
  WHERE finance_reversal_id IS NOT NULL;

-- Ces écritures sont irréversibles au niveau applicatif : un ajustement crée
-- une nouvelle trace. Une suppression des preuves demande une restauration
-- contrôlée, pas un « down » automatique qui effacerait le registre.
