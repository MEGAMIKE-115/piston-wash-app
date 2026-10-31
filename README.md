# MG Washers

App web instalable (PWA) para MG Washers: clientes, vehículos, historial con fotos, puntos y rangos, premios, solicitudes por WhatsApp y panel Jefe / empleado.

## Cómo está ordenado
```
mg-washers/
├─ index.html                  ← la única página (todas las pantallas)
├─ sw.js                       ← hace que la app abra rápido y se pueda instalar (debe estar en la raíz)
├─ manifest.webmanifest        ← nombre, colores e iconos de la app instalada (debe estar en la raíz)
│
├─ src/                        ← TODO EL CÓDIGO (JavaScript)
│  ├─ main.js                  ← arranque: decide qué pantalla ver
│  ├─ configuracion/           ← config.js: WhatsApp, puntos, rangos, catálogo y premios
│  ├─ conexion/                ← firebase.js: LA conexión con Firebase
│  ├─ autenticacion/           ← ingresar, crear cuenta, Google, perfil
│  ├─ cliente/                 ← la app del cliente (Inicio, Vehículos, Puntos, Solicitar)
│  ├─ admin/                   ← el panel del Jefe y empleados
│  ├─ reportes/                ← informe del servicio y PDF
│  ├─ galeria/                 ← galería pública
│  ├─ instalacion/             ← aviso «Instalar app» (la descarga)
│  └─ utilidades/              ← herramientas compartidas (fechas, dinero, rangos, fotos…)
│
├─ estilos/                    ← TODO EL DISEÑO (CSS), se aplica en orden 01 → 15
│  ├─ 01-variables-y-base.css  ← colores base y tipografía
│  ├─ 03-botones.css           ← los botones
│  ├─ 05-pantalla-acceso.css   ← login
│  ├─ 06-estructura-app.css    ← encabezado y barra de abajo
│  ├─ 07-cliente.css · 09-panel-admin.css · 08-reporte.css · 10-modal.css …
│  ├─ 14-tema-azul-dorado.css  ← el tema azul + dorado actual
│  └─ 15-rangos-y-colores.css  ← colores por rango (Bronce, Plata, Oro…)
│
├─ assets/iconos/              ← logo e iconos de la app
├─ firebase/firestore.rules    ← reglas de seguridad de la base de datos
└─ docs/                       ← guías (GUIA.md, GUIA-CODIGO.md, MAPA-DE-CABLES.md)
```

## Para modificar rápido
| Quiero cambiar… | Archivo |
|---|---|
| WhatsApp, puntos, rangos, precios, premios | `src/configuracion/config.js` |
| Colores de la marca | `estilos/01-variables-y-base.css` y `estilos/14-tema-azul-dorado.css` |
| Botones | `estilos/03-botones.css` |
| Colores por rango | `estilos/15-rangos-y-colores.css` |
| Pantalla del cliente | `src/cliente/cliente.js` + `estilos/07-cliente.css` |
| Panel del Jefe | `src/admin/admin.js` + `estilos/09-panel-admin.css` |
| Aviso de instalar | `src/instalacion/instalar.js` + `estilos/13-aviso-instalar.css` |

Después de cualquier cambio: sube el número de `VERSION` en `sw.js` para que los celulares se actualicen.
