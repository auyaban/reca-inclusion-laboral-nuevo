# Fixtures de actas anonimizadas

Este directorio contiene PDFs de actas reales con datos sensibles anonimizados
(nombres, cedulas, NITs reemplazados por valores ficticios).

## Como crear un fixture

1. Abrir el PDF original en un visor
2. Identificar datos sensibles: nombres propios, cedulas, NITs, emails
3. Reemplazar con valores ficticios:
   - Nombres → "Juan Perez", "Maria Lopez", etc.
   - Cedulas → "12345678", "87654321", etc.
   - NITs → "900123456", "800987654", etc.
   - Emails → "correo@ejemplo.com"
4. Guardar como PDF nuevo con nombre descriptivo

## Naming convention

`{tipo-servicio}-{modalidad}-{año}-{mes}.pdf`

Ejemplos:
- `presentacion-virtual-2025-06.pdf`
- `sensibilizacion-bogota-2025-03.pdf`
- `seleccion-incluyente-virtual-2025-01.pdf`
- `interprete-lsc-presencial-2025-04.pdf`

## Tipos de actas esperados

| Tipo | Nivel esperado | Descripcion |
|---|---|---|
| presentacion-virtual | Nivel 1 (RECA metadata) | Acta reciente con metadata incrustada |
| seleccion-incluyente | Nivel 2 (ACTA ID) | Acta con footer ACTA ID valido |
| sensibilizacion-antigua | Nivel 4 (regex) | Acta antigua sin metadata ni ACTA ID |
| imposible | Todos fallan | PDF corrupto o no es acta |
