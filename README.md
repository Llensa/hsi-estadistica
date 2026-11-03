# Estadísticas médicas (HSI)

App web para armar la planilla diaria de consultas por profesional, el consolidado del
centro de salud y los Anexos II de recupero financiero, a partir de los Excel exportados de HSI.
Todo se procesa en el navegador de la PC: no se sube ningún dato.

Hecha con Angular 20, Tailwind CSS 4 y SheetJS.

## Instalar y abrir (Windows)

1. Instalá **Node.js LTS** desde https://nodejs.org (versión 22 o 24) y reiniciá la PC.
2. Descomprimí el zip en una carpeta **nueva y vacía**, por ejemplo `C:\proyectos\volcado-hsi`.
   - No la pongas dentro de otra carpeta que tenga `package.json` o `node_modules`.
   - Evitá OneDrive y el Escritorio sincronizado.
3. Doble clic en **`iniciar.bat`**. La primera vez instala todo (unos minutos) y después abre
   `http://localhost:4200` solo.
4. Para probar, arrastrá los archivos de la carpeta `ejemplos` (son datos inventados).
5. Para cerrar la app, cerrá la ventana negra. Para volver a usarla, doble clic en `iniciar.bat`.

### Alternativa con la terminal

Abrí PowerShell **dentro** de la carpeta del proyecto (donde está `package.json`) y corré:

```powershell
npm install
npm start
```

Si PowerShell dice que "la ejecución de scripts está deshabilitada", usá `iniciar.bat`
o abrí "Símbolo del sistema" (cmd) en lugar de PowerShell.

## Cómo se usa

- **Ver General**: planilla consolidada de todos los profesionales y lista de archivos cargados.
- **Profesional**: planilla de cada uno y los avisos de calidad de datos de su archivo.
- **Imprimir**: hoja A4 horizontal, sin menú ni botones, con bordes negros.
- **Anexo II (Recupero)**: un comprobante por cada atención con obra social o prepaga,
  uno por hoja (A4 vertical). Se puede filtrar por profesional.

En el diálogo de impresión desactivá "Encabezados y pies de página".

## Reglas de cálculo

- **Encabezado**: se busca la fila que tiene "Fecha de atención" (normalmente la fila 4).
- **Día**: sale de "Fecha de atención". **Edad**: diferencia entre atención y nacimiento.
- **Rangos**: -1, 1, 2 a 4, 5 a 9, 10 a 14, 15 a 19, 20 a 49, 50 a 64, 65 y más.
- **Género**: "Varón cis" = M, "Mujer cis" = F. Cualquier otro valor o vacío va a
  "Sin Especificar" y aparece en los avisos.
- **N / R**: la primera atención de cada DNI en el archivo es N; las siguientes, R.
  Se cuenta por archivo (por profesional).
- **TOTAL CONSULTAS** = N + R. La fila **T** suma cada columna.
- **Filas descartadas**: sin fecha válida, nacimiento posterior a la atención o edad mayor
  a 120. Se listan con número de fila en los avisos.
- **Varios profesionales en un archivo**: se separa en una planilla por profesional.
  Las filas sin profesional van a "Sin profesional informado" con un aviso.
- **Mismo profesional en dos archivos del mismo mes**: aparece un aviso, porque sus
  atenciones se sumarían dos veces en el consolidado.
- **Quitar**: siempre pide confirmación. Si el archivo tenía varios profesionales, se puede
  quitar uno solo o el archivo completo.
- **Anexo II**: entra toda fila con obra social informada. No entran vacíos ni valores como
  "Sin obra social", "Ninguna" o "-" (lista en `src/app/core/anexo.ts`).

## Si algo falla

| Problema | Qué hacer |
| --- | --- |
| `npm install` falla con `xlsx` o `cdn.sheetjs.com` | La red bloquea ese sitio. `iniciar.bat` reintenta solo con la versión de npm. A mano: `npm install xlsx@0.18.5`. |
| `ERESOLVE` | Estás en una carpeta vieja. Usá una carpeta nueva y vacía. |
| La página se ve sin estilos | Verificá que exista `postcss.config.json` y que **no** exista `tailwind.config.js`. Cerrá y volvé a abrir `iniciar.bat`. |
| Pantalla en blanco | F12 > Console, copiá el error en rojo. |
| "No se encontró la columna 'Fecha de atención'" | El Excel usa otro nombre. Agregalo en `src/app/core/columnas.ts`. |

## Firebase (opcional, todavía no se usa)

Ver los comentarios en `src/app/app.config.ts`. Antes de guardar datos de pacientes en la nube
hace falta autenticación y reglas de seguridad.

## Estructura

- `src/app/core/`: lógica sin interfaz
  - `columnas.ts`: nombres de columnas aceptados
  - `parse-reporte.ts`: lectura del Excel
  - `calculos.ts`: fechas, edad, rangos, N/R, matriz de 31 días y consolidado
  - `anexo.ts`: pacientes con obra social
  - `avisos.ts`: avisos de calidad de datos
  - `estado.ts`: estado global (signals)
  - `confirmacion.ts`, `quitar.ts`: confirmación antes de quitar
- `src/app/components/`: sidebar, dropzone, planilla, avisos, lista, módulo y hoja del Anexo II
- `src/styles.css`: Tailwind (`@import "tailwindcss"`) y estilos de impresión
- `postcss.config.json`: conecta Tailwind 4 con Angular
- `ejemplos/`: archivos de prueba con datos inventados
- `CLAUDE.md`: contexto del proyecto para Claude Code
