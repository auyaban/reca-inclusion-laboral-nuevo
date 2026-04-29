-- Fases 1/2 QA manual: saneamiento historico conservador de catalogos Empresa.
-- Solo normaliza variantes exactas, seguras y observadas en remoto.
-- Valores ambiguos como SENA, ACTIVA / SENA, Stand by, Pendiente, Colsubsidio
-- y datos corridos quedan sin tocar para revision manual posterior.

update public.empresas
set caja_compensacion = 'No Compensar'
where caja_compensacion in ('No compensar', 'NO COMPENSAR');

update public.empresas
set caja_compensacion = 'Compensar'
where caja_compensacion = 'Compenasr';

update public.empresas
set estado = 'En Proceso'
where estado = 'En proceso';

update public.empresas
set estado = 'Cerrada'
where estado in ('Cerrado', 'cerrado', 'cerrada');

update public.empresas
set estado = 'Activa'
where estado in ('ACTIVA', 'Activo', 'Actiiva');

update public.empresas
set estado = 'Inactiva'
where estado = 'INACTIVA';

update public.empresas
set estado = 'Pausada'
where estado in ('pausada', 'Pausado', 'PAUSADO');
