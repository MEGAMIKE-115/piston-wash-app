# Guía del código (fácil)

Cada archivo `.js` empieza con un recuadro que dice **QUÉ HACE**, **QUÉ CAMBIAR** y **CABLES A** (con qué otros archivos se conecta). Empieza leyendo esos recuadros.

## Orden recomendado para estudiarlo
1. `src/configuracion/config.js` — datos del negocio (solo valores, nada complicado).
2. `src/utilidades/util.js` — funciones pequeñas que se reutilizan.
3. `src/conexion/firebase.js` — la conexión con la base de datos.
4. `src/autenticacion/auth.js` — el login.
5. `src/main.js` — el arranque: quién entra y a dónde va.
6. `src/cliente/cliente.js` — la app del cliente.
7. `src/admin/admin.js` — el panel (el más largo; léelo por pestañas).

## Cómo arranca la app (main.js)
1. Firebase dice si hay sesión.
2. Sin sesión → pantalla de acceso.
3. Con sesión → busca `usuarios/{uid}`: si el rol es jefe o empleado → panel admin.
4. Si no, busca `clientes/{uid}` → app del cliente.
5. Si tampoco existe → pide completar el perfil.

## El patrón que se repite en cada pantalla
1. **Pedir datos** a Firestore (`getDocs`, `getDoc`).
2. **Pintar** el HTML con plantillas `` `...` `` dentro de la pantalla.
3. **Conectar** los botones (`onclick`, `onsubmit`) que guardan en Firestore.

## Puntos y rangos
- 1 punto por cada `PUNTOS_POR_PESOS` pesos pagados (hoy $1.000).
- El rango usa los puntos **históricos** (`puntosAcumulados`), que nunca bajan.
- Los puntos para gastar (`puntosDisponibles`) bajan al canjear.
- Rangos y divisiones: `RANGOS` y `LEYENDA` en `config.js`; el cálculo está en `infoNivel()` de `util.js`.

## Recetas
- **Cambiar precios del catálogo:** `CATALOGO_INICIAL` en `config.js` (o editar en el panel → Catálogo).
- **Cambiar premios:** panel → Premios (sin tocar código).
- **Tu WhatsApp:** `NEGOCIO.whatsapp` = `57` + número.
- **Nuevo tipo de vehículo:** `TIPOS_VEHICULO` en `config.js`.
- **Nueva pestaña del panel:** agregarla a la lista `pestanas` en `admin.js` y crear su función `vistaXxx()`.
- **Nuevo archivo de estilos:** crearlo en `estilos/` y agregar su `<link>` en `index.html` y su ruta en `sw.js`.
