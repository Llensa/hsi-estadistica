# Estadísticas médicas (volcado-hsi)

App web que lee los Excel exportados de HSI (uno por profesional) y arma:
la planilla diaria de consultas por profesional, el consolidado del centro de salud
y los Anexos II de recupero financiero. Es una app de escritorio (Electron) sin backend.

## Comandos

- `npm install`: instalar dependencias
- `npm start`: servidor de desarrollo en http://localhost:4200
- `npm run build`: compilación de producción (usala para verificar que no hay errores)
- `npm test`: tests de `src/app/core` (necesita Chrome, o `CHROME_BIN` apuntando a Edge)
- `npm run app`: compila y abre la app de escritorio
- `npm run dist`: genera `release/Estadisticas-medicas.exe` (portable)
- Archivos de prueba con datos inventados: `ejemplos/`

## Stack

- Angular 20: componentes standalone, signals, zoneless, control flow `@if`/`@for`
- Tailwind CSS 4 vía `postcss.config.json` y `@import "tailwindcss"` en `src/styles.css`.
  No usar `tailwind.config.js` ni directivas `@tailwind` (son de la versión 3).
- SheetJS (`xlsx`) desde cdn.sheetjs.com, cargado con `import()` dinámico
- Windows + PowerShell en la PC del usuario

## Estructura

- `src/app/core/`: lógica sin interfaz. Mantener funciones puras y testeables.
  - `columnas.ts`: nombres de columnas aceptados de HSI (normalizados con `normClave`)
  - `parse-reporte.ts`: lectura del Excel, búsqueda del encabezado, separación por profesional
  - `calculos.ts`: fechas, edad, rangos etarios, N/R, matriz de 31 días, consolidado
  - `anexo.ts`: pacientes con obra social para el Anexo II
  - `avisos.ts`: avisos de calidad de datos
  - `busqueda.ts`: filtro de profesionales de la barra lateral
  - `resumen.ts`: control de Anexos y totales por obra social
  - `exportar.ts`: Excel único con todo lo cargado (pacientes solo si el usuario lo elige)
  - `lector.ts`, `lector.worker.ts`: lectura de Excel en un Web Worker
  - `estado.ts`: estado global con signals
  - `confirmacion.ts` y `quitar.ts`: confirmación antes de borrar
- `src/app/components/`: un componente por archivo, plantilla inline, `OnPush`

## Reglas de negocio (no cambiar sin confirmar con el usuario)

- Encabezado: la fila que contiene "Fecha de atención" (normalmente la fila 4).
- Edad = fecha de atención - fecha de nacimiento.
- Rangos: -1, 1, 2 a 4, 5 a 9, 10 a 14, 15 a 19, 20 a 49, 50 a 64, 65 y más.
- Género: "Varón cis" = M, "Mujer cis" = F, cualquier otro valor = "Sin Especificar".
- N/R: primera atención de cada DNI dentro de la planilla del profesional = N; las siguientes = R.
- TOTAL CONSULTAS = N + R. Fila T = suma vertical.
- Si un archivo trae varios profesionales, se separa en una planilla por profesional.
- Quitar planillas siempre pide confirmación.

## Convenciones

- Textos de la interfaz en español rioplatense (vos), cortos y claros.
- Impresión: planilla en A4 horizontal y Anexo II en A4 vertical, una hoja por paciente.
  Lo que no se imprime lleva la clase `no-print`.
- Después de cada cambio, correr `npm run build` y revisar que no haya errores.

## Datos sensibles

Los Excel reales de HSI tienen nombres, DNI y diagnósticos de pacientes.
Nunca leer, copiar ni pedir archivos reales: usar solo `ejemplos/` o archivos
con datos inventados.

`electron/main.cjs` bloquea toda conexión externa y usa una sesión solo en memoria.
No quitar esas protecciones ni agregar persistencia de datos sin confirmar con el usuario.
