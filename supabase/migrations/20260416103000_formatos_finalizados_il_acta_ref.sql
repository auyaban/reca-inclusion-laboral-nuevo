alter table public.formatos_finalizados_il
add column if not exists acta_ref text;

create unique index if not exists formatos_finalizados_il_acta_ref_unique_idx
on public.formatos_finalizados_il (acta_ref)
where acta_ref is not null;
