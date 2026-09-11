BEGIN;
DO $$ BEGIN
  IF current_database() <> 'tachi_back_staging' THEN
    RAISE EXCEPTION 'This catalog is for the isolated staging database only';
  END IF;
END $$;

INSERT INTO token_packs (id, key, name, "tokenAmount", "bonusTokenAmount", "priceAmountCents", currency, "sortOrder", "billingType", "lsVariantId", active, "createdAt", "updatedAt")
VALUES
  ('staging-tokens-starter-20260911', 'starter-tokens', 'Starter', 250, 0, 200, 'usd', 10, 'one_time', '2115674', true, now(), now()),
  ('staging-tokens-pro-20260911', 'pro-tokens', 'Pro', 1250, 0, 1000, 'usd', 20, 'one_time', '2115687', true, now(), now()),
  ('staging-tokens-power-20260911', 'power-tokens', 'Power', 2750, 0, 2000, 'usd', 30, 'one_time', '2115698', true, now(), now())
ON CONFLICT (key) DO NOTHING;

DO $$ BEGIN
  IF (SELECT count(*) FROM token_packs WHERE active AND "billingType" = 'one_time' AND currency = 'usd' AND "bonusTokenAmount" = 0 AND
    (key, "tokenAmount", "priceAmountCents", "lsVariantId") IN (
      ('starter-tokens', 250, 200, '2115674'),
      ('pro-tokens', 1250, 1000, '2115687'),
      ('power-tokens', 2750, 2000, '2115698')
    )) <> 3 THEN
    RAISE EXCEPTION 'Existing staging catalog differs; review it instead of overwriting manager changes';
  END IF;
END $$;
COMMIT;
