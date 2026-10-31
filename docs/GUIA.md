# MG Washers PWA — puesta en marcha

## 1. Sube los archivos a GitHub
Sube **el contenido** de la carpeta a la raíz del repositorio (arrastra todo junto, con sus subcarpetas):

```
index.html  sw.js  manifest.webmanifest  README.md
src/  estilos/  assets/  firebase/  docs/
```
Si el repositorio tiene archivos de versiones anteriores (`app.js`, `style.css`, `js/`, `icons/`, `firestore.rules`, `GUIA.md`), bórralos: ya no se usan.

## 2. Firebase (consola)
1. **Authentication → Método de acceso**: deja *Correo/contraseña* y activa **Google**.
2. **Authentication → Configuración → Dominios autorizados**: agrega tu dominio de Netlify (`pistonwash.netlify.app` o el nuevo).
3. **Firestore → Reglas**: pega el contenido de `firebase/firestore.rules` y **Publicar**.
4. El Jefe y los empleados siguen igual: usuario en Authentication + documento en `usuarios/{uid}` con `rol` = `jefe` o `empleado` y `nombre`.

## 3. Tu WhatsApp
En `src/configuracion/config.js` cambia `whatsapp: "57XXXXXXXXXX"` por tu número (ej. `573001234567`).

## 4. Prueba local
Abre con **Live Server** (nunca doble clic). Entra como Jefe y haz:
1. **Catálogo → Cargar catálogo inicial** y ajusta los precios.
2. **Premios → Cargar premios iniciales** (o crea los tuyos).
3. Desde otro navegador o ventana privada: crea una cuenta de cliente.
4. **Nuevo servicio**: busca al cliente por celular o placa, sube fotos y guarda.

## 5. Publicar
`git push` → Netlify publica solo. En el celular: abrir el link → menú del navegador → **Agregar a pantalla de inicio**.
Si cambias archivos y no ves el cambio en el celular, sube `VERSION` en `sw.js` (`mg-v9`, `mg-v10`…).

## Cómo funciona
| Quién | Qué hace |
|---|---|
| Cliente | Crea cuenta (Google o correo), registra vehículos, ve sus reportes con fotos, puntos, canjea premios y solicita servicios (se guarda y abre WhatsApp). |
| Empleado | Registra servicios con fotos, busca clientes, atiende solicitudes y recordatorios. Su servicio queda con **pago pendiente**. |
| Jefe | Todo lo anterior + confirma pagos (ahí se suman los puntos), entrega canjes, ve ingresos, edita catálogo y premios. |

- **Puntos**: 1 por cada $1.000 (`PUNTOS_POR_PESOS` en `src/configuracion/config.js`). Rangos: Bronce, Plata, Oro, Platino, Diamante, Maestro y Leyenda (sin final), con divisiones III, II y I.
- **Solo el Jefe mueve puntos**: lo imponen las reglas de Firestore, no solo la pantalla.
- **Fotos**: se comprimen en el celular y se guardan en Firestore (máx. 3 por categoría). Plan gratis de Firestore: 1 GiB, alcanza para más de mil servicios con fotos. Si pasas a plan Blaze y quieres Firebase Storage, solo cambias `src/utilidades/fotos.js`.
- **Galería pública**: solo se publica si el cliente la autorizó al registrarse y tú marcas la casilla en ese servicio. Usa la miniatura, sin placa.
- **Servicios guardados antes** (solo moto) siguen apareciendo: se mantiene la colección `diagnosticos`.
- Sin Cloud Functions ni plan de pago: todo corre en el navegador con reglas de seguridad.

## Pendientes que no incluí
Ranking mensual Top 10 y salón de la fama, porcentaje de comisión por empleado, QR de quejas y pago por QR.
