# Mapa de cables (dónde se conecta cada cosa)

## Conexión con Firebase
- **Una sola puerta:** `src/conexion/firebase.js`. Ahí están las llaves (vienen de `src/configuracion/config.js`) y se exportan las funciones de Auth y Firestore.
- Todos los demás archivos importan de ese archivo, nunca directo de internet.
- **Reglas de seguridad:** `firebase/firestore.rules` (se pegan en Firebase → Firestore → Reglas).

## Colecciones de Firestore y quién las usa
| Colección | Qué guarda | Archivos que la usan |
|---|---|---|
| `canjes` | Canjes pedidos / entregados | `admin/admin.js`, `cliente/cliente.js` |
| `clientes` | Perfil, puntos y rango de cada cliente | `admin/admin.js`, `autenticacion/auth.js`, `cliente/cliente.js`, `main.js` |
| `diagnosticos` | Servicios realizados (con subcolección de fotos) | `admin/admin.js`, `cliente/cliente.js`, `utilidades/fotos.js` |
| `galeria` | Fotos públicas autorizadas | `admin/admin.js`, `galeria/galeria.js` |
| `premios` | Premios canjeables con puntos | `admin/admin.js`, `cliente/cliente.js` |
| `servicios_catalogo` | Catálogo de servicios y precios | `admin/admin.js`, `cliente/cliente.js` |
| `solicitudes` | Pedidos de servicio que abren WhatsApp | `admin/admin.js`, `cliente/cliente.js` |
| `usuarios` | Personal (jefe / empleado) y su rol | `main.js` |
| `vehiculos` | Vehículos de cada cliente | `admin/admin.js`, `cliente/cliente.js` |

## Otros cables
| Cable | Archivo |
|---|---|
| Descarga / instalar la app | `src/instalacion/instalar.js` + `manifest.webmanifest` + `sw.js` |
| WhatsApp (número del negocio) | `src/configuracion/config.js` → `NEGOCIO.whatsapp` |
| Puntos y rangos | `src/configuracion/config.js` (reglas) y `src/utilidades/util.js` (cálculo) |
| Botones | `estilos/03-botones.css` |
| Colores de la marca | `estilos/01-variables-y-base.css` y `estilos/14-tema-azul-dorado.css` |
| Colores por rango | `estilos/15-rangos-y-colores.css` |
