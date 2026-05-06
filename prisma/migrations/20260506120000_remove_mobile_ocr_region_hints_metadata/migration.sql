UPDATE "job_assets"
SET "metadata" = CASE
    WHEN ("metadata"::jsonb - 'mobileOcrRegionHints') = '{}'::jsonb THEN NULL
    ELSE ("metadata"::jsonb - 'mobileOcrRegionHints')
END
WHERE "metadata" IS NOT NULL
  AND "kind" = 'page_upload'
  AND jsonb_typeof("metadata"::jsonb) = 'object'
  AND ("metadata"::jsonb ? 'mobileOcrRegionHints');
