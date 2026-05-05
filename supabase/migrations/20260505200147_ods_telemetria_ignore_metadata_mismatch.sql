-- ODS #146 - Ignore motor-only metadata when calculating telemetry mismatches.
--
-- This intentionally replaces only the pure mismatch helper. The
-- ods_motor_telemetria_finalize RPC remains owned by its existing migration,
-- including the actor_user_id transition from #82.

create or replace function public.ods_motor_telemetria_mismatch_fields(
  p_motor_suggestion jsonb,
  p_final_value jsonb
)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_key text;
  v_mismatches text[] := '{}'::text[];
  v_ignored text[] := array[
    'alternatives',
    'confidence',
    'observaciones',
    'rationale',
    'rank',
    'score'
  ];
begin
  if p_motor_suggestion is null or jsonb_typeof(p_motor_suggestion) is distinct from 'object' then
    return v_mismatches;
  end if;

  for v_key in
    select key
    from jsonb_object_keys(p_motor_suggestion) as keys(key)
    where not (key = any(v_ignored))
    order by key
  loop
    if not public.ods_motor_telemetria_values_equal(
      p_motor_suggestion -> v_key,
      coalesce(p_final_value, '{}'::jsonb) -> v_key
    ) then
      v_mismatches := array_append(v_mismatches, v_key);
    end if;
  end loop;

  return v_mismatches;
end;
$$;

revoke execute on function public.ods_motor_telemetria_mismatch_fields(jsonb, jsonb)
  from public, anon, authenticated;
