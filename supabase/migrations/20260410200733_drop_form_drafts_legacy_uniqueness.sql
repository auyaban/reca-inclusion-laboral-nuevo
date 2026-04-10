ALTER TABLE public.form_drafts
  DROP CONSTRAINT IF EXISTS form_drafts_user_form_empresa;

ALTER TABLE public.form_drafts
  DROP CONSTRAINT IF EXISTS form_drafts_unique;

DROP INDEX IF EXISTS public.form_drafts_user_form_empresa;
DROP INDEX IF EXISTS public.form_drafts_unique;

DO $$
DECLARE
  constraint_record record;
  index_record record;
BEGIN
  FOR constraint_record IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel
      ON rel.oid = con.conrelid
    JOIN pg_namespace nsp
      ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'form_drafts'
      AND con.contype = 'u'
      AND (
        SELECT array_agg(att.attname::text ORDER BY key_columns.ordinality)
        FROM unnest(con.conkey) WITH ORDINALITY AS key_columns(attnum, ordinality)
        JOIN pg_attribute att
          ON att.attrelid = rel.oid
         AND att.attnum = key_columns.attnum
      ) = ARRAY['user_id'::text, 'form_slug'::text, 'empresa_nit'::text]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.form_drafts DROP CONSTRAINT IF EXISTS %I',
      constraint_record.conname
    );
  END LOOP;

  FOR index_record IN
    SELECT idx.relname AS index_name
    FROM pg_index ind
    JOIN pg_class rel
      ON rel.oid = ind.indrelid
    JOIN pg_namespace nsp
      ON nsp.oid = rel.relnamespace
    JOIN pg_class idx
      ON idx.oid = ind.indexrelid
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'form_drafts'
      AND ind.indisunique
      AND pg_get_indexdef(ind.indexrelid) ILIKE '%(user_id, form_slug, empresa_nit)%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', index_record.index_name);
  END LOOP;
END $$;
