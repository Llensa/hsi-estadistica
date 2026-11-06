# Estadísticas médicas (HSI)

Aplicación de escritorio para armar la planilla diaria de consultas por profesional, el
consolidado del centro de salud y los Anexos II de recupero financiero, a partir de los Excel
exportados de HSI. Todo se procesa en la PC: la app no se conecta a internet ni guarda los
datos cargados.

Hecha con Angular 20, Tailwind CSS 4, SheetJS y Electron.

## Aviso de responsabilidad

**Leé este aviso antes de usar el programa. Al usarlo, lo aceptás.**

Este programa se entrega "tal como está", sin garantías de ningún tipo, ni siquiera de que
sus cálculos sean exactos. Quien lo usa debe controlar los resultados antes de presentarlos.

Los archivos que se cargan pueden contener datos personales y de salud, que la Ley 25.326
de Protección de Datos Personales de Argentina considera sensibles. **La persona o institución
que usa el programa es la única responsable** de:

- tener autorización para acceder a esos datos y tratarlos;
- guardar, imprimir, compartir y eliminar de forma segura los archivos y las planillas;
- cualquier filtración, pérdida, acceso indebido o mal uso de los datos;
- cumplir la normativa aplicable y las reglas de su institución.

**El creador del programa no accede a los datos, no los recibe ni los administra**, y no se
hace responsable por las filtraciones, los daños o los usos indebidos que surjan del uso del
programa, en la máxima medida que permita la ley.

## Usar la app (Windows)

1. Conseguí el archivo **`Estadisticas-medicas.exe`**. No hace falta instalar nada.
2. Abrilo con doble clic. Puede tardar hasta 20 segundos en arrancar. Solo se abre una ventana
   por vez: si ya está abierta, se trae al frente. Cada vez que se abre hay que aceptar el aviso
   de responsabilidad.
3. La primera vez, Windows puede mostrar "Windows protegió su PC" porque el programa no tiene
   firma digital. Si lo recibiste de una fuente de confianza, tocá **Más información** y
   **Ejecutar de todas formas**.

Guardá los Excel de HSI en una carpeta personal protegida, nunca dentro de la carpeta del proyecto.

## Generar el .exe

Con Node.js instalado, dentro de la carpeta del proyecto:

```powershell
npm install
npm run dist
```

El archivo queda en `release\Estadisticas-medicas.exe`. Para probar la app sin generar el
archivo, usá `npm run app`.

## Desarrollo: abrir en el navegador

Este modo no tiene las protecciones del `.exe`. Usalo solo con los archivos de `ejemplos`.

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
- **Formato**: arriba de cada planilla se elige **Planilla diaria** (31 días), **Resumen mensual**
  (formulario 2.1, Resumen Mensual de Consultorio Externo) o **Ambas**. El formato elegido es el que
  se ve, se imprime y se exporta. En el resumen mensual, localidad, dependencia, región sanitaria y
  hoja N° se completan a mano porque no vienen en HSI (no se guardan al cerrar).
- **Buscar**: la barra lateral filtra por profesional o especialidad. Enter abre el primero.
- **Imprimir**: hoja A4 horizontal, sin menú ni botones, con bordes negros.
- **Imprimir todo el mes**: el consolidado y una hoja por profesional, de una sola vez.
- **Exportar a Excel**: un solo archivo con resumen, consolidado, una hoja por profesional y
  obras sociales, en el formato elegido. Debajo de cada hoja hay **Referencias** que explican cada
  apartado. Se puede agregar una hoja con todas las atenciones: incluye nombres, DNI y
  diagnósticos, así que ese archivo queda bajo tu responsabilidad.
- **Anexo II (Recupero)**: un comprobante por cada atención con obra social o prepaga,
  uno por hoja (A4 vertical). Se puede filtrar por profesional, obra social y mes. Muestra los
  Anexos incompletos y los totales por obra social.

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
| `npm install` falla con `xlsx` o `cdn.sheetjs.com` | La red bloquea ese sitio. Probá desde otra red. No instales `xlsx@0.18.5`: tiene fallas de seguridad conocidas. |
| `ERESOLVE` | Estás en una carpeta vieja. Usá una carpeta nueva y vacía. |
| La página se ve sin estilos | Verificá que exista `postcss.config.json` y que **no** exista `tailwind.config.js`. Cerrá y volvé a abrir `iniciar.bat`. |
| Pantalla en blanco | En `npm start`: F12 > Console, copiá el error en rojo. En el `.exe` las herramientas de desarrollo están desactivadas. |
| "No se encontró la columna 'Fecha de atención'" | El Excel usa otro nombre. Agregalo en `src/app/core/columnas.ts`. |

## Estructura

- `src/app/core/`: lógica sin interfaz
  - `columnas.ts`: nombres de columnas aceptados
  - `parse-reporte.ts`: lectura del Excel
  - `calculos.ts`: fechas, edad, rangos, N/R, matriz de 31 días y consolidado
  - `anexo.ts`: pacientes con obra social
  - `avisos.ts`: avisos de calidad de datos
  - `busqueda.ts`: filtro de profesionales
  - `resumen.ts`: control de Anexos y totales por obra social
  - `exportar.ts`: Excel con todo lo cargado
  - `rmce.ts`: Resumen Mensual de Consultorio Externo (versión corta)
  - `lector.ts`, `lector.worker.ts`: lectura de Excel en segundo plano
  - `estado.ts`: estado global (signals)
  - `confirmacion.ts`, `quitar.ts`: confirmación antes de quitar
- `src/app/components/`: sidebar, dropzone, planilla, avisos, lista, módulo y hoja del Anexo II
- `electron/main.cjs`: app de escritorio, bloqueo de internet y sesión solo en memoria
- `src/styles.css`: Tailwind (`@import "tailwindcss"`) y estilos de impresión
- `postcss.config.json`: conecta Tailwind 4 con Angular
- `ejemplos/`: archivos de prueba con datos inventados
- `CLAUDE.md`: contexto del proyecto para Claude Code
