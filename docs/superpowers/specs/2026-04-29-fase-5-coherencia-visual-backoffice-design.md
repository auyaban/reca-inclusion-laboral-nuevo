# Fase 5 - Coherencia visual del backoffice

## Estado

Diseño aprobado por producto el 29 de abril de 2026. Este spec define la base para el plan de implementación de Fase 5.

## Objetivo

Alinear el módulo `/hub/empresas*` con el lenguaje visual ya consolidado en los formularios productivos, sin convertirlo en un formulario largo ni cambiar reglas de negocio. El resultado debe sentirse parte de la misma aplicación: misma tipografía, jerarquía, estados, errores y disciplina visual, con acentos RECA/legacy para que el backoffice tenga identidad propia.

## Alcance

Incluido en Fase 5:

- Home de `/hub/empresas`.
- Lista de Empresas.
- Lista de Profesionales.
- Formularios de crear/editar Empresa.
- Formularios de crear/editar Profesional.
- Detalles, acciones sensibles, estados vacíos y actividad reciente.
- Capa de componentes visuales reutilizables para futuros paneles de Asesores, Gestores e Intérpretes.

Fuera de alcance:

- Rediseñar el sidebar/header general del hub.
- Rediseñar `/hub` de formatos.
- Modificar `/formularios/*`.
- Activar Asesores, Gestores o Intérpretes.
- Cambiar contratos API, rutas públicas, reglas de validación, sorting o filtros.
- Implementar columnas móviles.

## Dirección visual

La dirección aprobada es **RECA + acentos legacy**:

- Base visual tomada de formularios: Lato, fondo gris claro, cards blancas, bordes suaves, radios generosos, foco RECA, estados visibles y acciones claras.
- Acentos por módulo: morado RECA como color principal, con verde/teal como apoyo para Empresas y estados operativos.
- Densidad de backoffice: listados, filtros y tablas siguen siendo compactos y escaneables; formularios/detalles usan más aire y estructura por secciones.
- No se copia el estilo Tkinter legacy; solo se recupera la idea de módulos con color e identidad.

## Regla de contraste

El contraste es requisito de aceptación, no preferencia estética. Ninguna pantalla se considera aprobada si tiene texto user-facing de bajo contraste.

Criterios concretos:

- Texto principal: gris 900 o blanco sobre fondo oscuro.
- Texto secundario: gris 700 o gris 600 según tamaño.
- Texto auxiliar pequeño: mínimo gris 600.
- Labels: gris 700.
- Links y acciones RECA: morado oscuro legible.
- Badges: fondo suave con texto oscuro.
- Errores: rojo legible con fondo suave y borde claro.
- No usar gris 300/400 sobre blanco para contenido que el usuario deba leer.

## Componentes propuestos

Crear una capa visual bajo `src/components/backoffice/` o extender la existente si ya aplica:

- `BackofficePageHeader`: título, subtítulo, breadcrumb corto, acción principal y acento del módulo.
- `BackofficeSectionCard`: contenedor estándar para formularios, detalles y paneles laterales.
- `BackofficeField`: label, ayuda, error e input/select/textarea consistente.
- `BackofficeTable`: envoltorio de tabla con header, filtros, estado vacío, paginación y acciones.
- `BackofficeBadge`: estados operativos como Activa, En Proceso, Eliminado, Sin acceso, Acceso activo y Contraseña temporal.
- `BackofficeFeedback`: errores, éxito, guardando, vacío y confirmaciones destructivas.

Los componentes deben ser pequeños y reutilizables. No deben mezclar lógica de negocio ni fetch de datos.

## Aplicación por pantalla

### Home de Empresas

- Encabezado con gradiente RECA/teal y texto de apoyo legible.
- Cards de módulos con icono, borde/acento por módulo y estados habilitado/deshabilitado.
- Empresas y Profesionales activos; Asesores, Gestores e Intérpretes visibles pero deshabilitados.

### Listas

- Mantener tabla como protagonista.
- Filtros en card clara, con inputs y selects consistentes.
- Headers ordenables ya existentes mantienen su comportamiento.
- Estados visibles con badges consistentes.
- Acciones claras, sin exceso de color.
- Estados vacíos con mensaje útil y acción si aplica.

### Crear/editar/detalle

- Cards por sección, visualmente cercanas a formularios largos.
- Encabezados de sección con icono/acento cuando aporte orientación.
- Errores por campo y resumen superior consistentes.
- Botones primarios/secundarios/destructivos con jerarquía clara.
- Actividad reciente más escaneable: título, actor, fecha/hora y detalle compacto.

## Error Handling y estados

La Fase 5 no cambia validaciones, pero sí estandariza cómo se muestran:

- Error de formulario: resumen visible arriba y error local por campo.
- Error de API: alerta superior con mensaje claro.
- Guardando: botón deshabilitado con spinner/texto.
- Éxito: confirmación visible y breve.
- Estado vacío: no debe parecer error; debe explicar qué falta y qué acción tomar.
- Estado deshabilitado: visible pero no confundible con acción disponible.

## Accesibilidad y ortografía

- Todo texto user-facing debe estar en español Colombia, con ortografía correcta y cero mojibake.
- Mantener `npm run spellcheck` como verificación obligatoria.
- Los iconos deben acompañar texto cuando la acción pueda ser ambigua.
- `aria-label` o texto visible para acciones icon-only.
- Foco visible en inputs, botones y links.
- No depender solo del color para comunicar estado.

## Restricciones técnicas

- No fetch directo a Supabase desde componentes.
- No tocar `/formularios/*`, `src/components/forms/*`, `src/lib/finalization/*`, `src/app/api/formularios/*` ni hooks de estado de formularios.
- Mantener Tailwind + `cn()` y patrones existentes.
- No crear nueva librería UI.
- No introducir migraciones.

## Verificación esperada

Durante implementación:

- Tests de render para componentes backoffice nuevos.
- Tests de listas/formularios donde cambie la estructura.
- `npm run lint`.
- `npm run spellcheck`.
- `npm run build`.
- `npm run test:e2e:smoke`.

QA manual y preview de Vercel quedan diferidos para después de implementar Fase 5, según decisión de producto.

## Decisiones aprobadas

- Aplicar Fase 5 solo a `/hub/empresas*`.
- Usar dirección visual RECA + acentos legacy.
- Crear componentes reutilizables para futuras áreas.
- Mantener backoffice operativo y compacto en listados.
- Asegurar contraste alto en todo texto user-facing.
