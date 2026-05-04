-- ODS #73: lookup server-only acotado para formatos_finalizados_il por ACTA ID.
-- SECURITY DEFINER + search_path='' reduce riesgo de shadowing y expone solo
-- acta_ref, registro_id y payload_normalized al caller service_role.

create or replace function public.formato_finalizado_lookup_by_acta_ref(
  p_acta_ref text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if nullif(btrim(p_acta_ref), '') is null then
    return null;
  end if;

  select jsonb_build_object(
    'acta_ref', f.acta_ref,
    'registro_id', f.registro_id,
    'payload_normalized', f.payload_normalized
  )
  into v_result
  from public.formatos_finalizados_il f
  where f.acta_ref = p_acta_ref;

  return v_result;
end;
$$;

revoke execute on function public.formato_finalizado_lookup_by_acta_ref(text)
  from public, anon, authenticated;

grant execute on function public.formato_finalizado_lookup_by_acta_ref(text)
  to service_role;
