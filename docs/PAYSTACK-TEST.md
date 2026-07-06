# Tests Paystack (sandbox) — Mon Prof Perso

## Clés

Configurer dans `backend/.env` (local) et `backend/.env.staging` (VPS) — **ne jamais committer** :

```env
PAYSTACK_SECRET_KEY=sk_test_…
PAYSTACK_PUBLIC_KEY=pk_test_…
```

Local : laisser `PAYSTACK_MOCK=true` pour que `npm test` reste sans appel réseau.  
Staging : **sans** `PAYSTACK_MOCK` → appels sandbox réels.

## Webhook (dashboard Paystack)

URL : `https://staging-api.monprofperso.com/api/payments/paystack/webhook`  
(Prod : `https://api.monprofperso.com/api/payments/paystack/webhook`)

## Numéros de test (doc Paystack)

| Opérateur | Numéro test | OTP test |
|-----------|-------------|----------|
| Orange CI | `0700000000` | `1234` |
| MTN (doc) | `0551234987` | — |

Utiliser ces numéros **uniquement** en sandbox (`sk_test_…`).

## Test manuel (staging)

```bash
API=https://staging-api.monprofperso.com
TOKEN=$(curl -s -X POST "$API/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2250758421903"}' | jq -r .token)

BOOK=$(curl -s -X POST "$API/api/bookings" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"teacherId":1,"subject":"Test","price":1000,"format":"online"}')

CID=$(echo "$BOOK" | jq -r .course.id)

curl -s -X POST "$API/api/payments/charge-mobile" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"courseId\":$CID,\"provider\":\"orange\",\"phone\":\"0700000000\"}"
```

Si `status` = `otp_required` → `POST /api/payments/submit-otp` avec `{ "paymentId", "otp": "1234" }`.

## Sécurité

Régénérer les clés sur [dashboard Paystack](https://dashboard.paystack.com) si elles ont été exposées (chat, commit, etc.).
