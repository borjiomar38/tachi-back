-- Catalog data only. Schema changes are applied by Prisma migrations.
-- Never rewrites historical subscription packs or existing manager-edited offers.
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'tachi_back_production' THEN
    RAISE EXCEPTION 'This catalog is restricted to the production database';
  END IF;
END $$;

INSERT INTO token_packs (id, key, name, "tokenAmount", "bonusTokenAmount", "priceAmountCents", currency, "sortOrder", "billingType", "lsVariantId", active, "createdAt", "updatedAt")
VALUES
  ('production-tokens-starter-20260912', 'starter-tokens', 'Starter', 250, 0, 200, 'usd', 10, 'one_time', '2116808', true, now(), now()),
  ('production-tokens-pro-20260912', 'pro-tokens', 'Pro', 1250, 0, 1000, 'usd', 20, 'one_time', '2116810', true, now(), now()),
  ('production-tokens-power-20260912', 'power-tokens', 'Power', 2750, 0, 2000, 'usd', 30, 'one_time', '2116813', true, now(), now())
ON CONFLICT (key) DO NOTHING;

DO $$ BEGIN
  IF (SELECT count(*) FROM token_packs WHERE active AND "billingType" = 'one_time' AND currency = 'usd' AND "bonusTokenAmount" = 0 AND
    (key, "tokenAmount", "priceAmountCents", "lsVariantId") IN (
      ('starter-tokens', 250, 200, '2116808'),
      ('pro-tokens', 1250, 1000, '2116810'),
      ('power-tokens', 2750, 2000, '2116813')
    )) <> 3 THEN
    RAISE EXCEPTION 'Production catalog differs: review rather than overwriting existing offers';
  END IF;
END $$;
COMMIT;
