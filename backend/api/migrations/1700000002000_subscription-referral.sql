-- Up Migration
-- Sort les endpoints /subscription/mine et /referral du code (constantes en dur)
-- vers des tables user-scoped (vraies données par utilisateur).

CREATE TABLE user_subscriptions (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',  -- active | paused | none
  detail      TEXT NOT NULL,
  next_charge TEXT NOT NULL,                    -- '1 juil.'
  next_amount INT NOT NULL,
  used        INT NOT NULL DEFAULT 0,
  total       INT NOT NULL
);

CREATE TABLE referrals (
  id        SERIAL PRIMARY KEY,
  user_id   INT REFERENCES users(id) ON DELETE CASCADE,
  code      TEXT NOT NULL,
  referred  INT NOT NULL DEFAULT 0,
  earned    INT NOT NULL DEFAULT 0
);

-- Seed (mêmes valeurs que les anciennes constantes, pour l'utilisateur de démo).
INSERT INTO user_subscriptions (user_id, plan, status, detail, next_charge, next_amount, used, total) VALUES
  (1, 'Régulier', 'active', '2 cours par semaine · Prof attitré Koffi', '1 juil.', 26000, 5, 8);

INSERT INTO referrals (user_id, code, referred, earned) VALUES
  (1, 'AYA2026', 3, 6000);

-- Down Migration
DROP TABLE IF EXISTS referrals;
DROP TABLE IF EXISTS user_subscriptions;
