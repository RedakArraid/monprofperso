-- Une perte de plateforme n'est ni une annulation de la rémunération professeur
-- ni un nouvel encaissement. Elle résulte d'une décision opérateur explicite.
ALTER TABLE finance_operations
  ADD COLUMN platform_loss_amount INT NOT NULL DEFAULT 0 CHECK (platform_loss_amount >= 0 AND platform_loss_amount <= amount),
  ADD COLUMN platform_loss_accepted_at TIMESTAMPTZ,
  ADD COLUMN platform_loss_accepted_by INT REFERENCES users(id),
  ADD CONSTRAINT finance_loss_decision_required CHECK (platform_loss_amount=0 OR
    (kind='refund' AND platform_loss_accepted_at IS NOT NULL AND platform_loss_accepted_by IS NOT NULL));
