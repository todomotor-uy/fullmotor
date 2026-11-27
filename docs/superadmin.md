# Panel de superadmin

Una pantalla con métricas de todos los sitios, por sitio y en total, para un rango de fechas:

- usuarios;
- clasificados;
- comercios;
- notas, eventos y comentarios;
- catálogo y publicidad;
- errores de la API y del front;
- los comentarios que dejan los usuarios con "Enviar comentario".

No es parte de ningún portal. Es una app Next.js aparte, en su propio proyecto de Vercel, sin dominio por ahora.

## Dónde vive

- **Código:** [`superadmin/`](../superadmin) en este repo, con su propio `package.json`, `tsconfig`, ESLint y Tailwind. No importa nada de `src/`: lo que comparte con los portales (los botones, los chips, el select y los tokens de diseño) es una copia.
- **Proyecto de Vercel:** `vitri-superadmin`, con Root Directory `superadmin`. Usa el mismo repo que los portales.
- **API:** las rutas `/api/superadmin/*` de vitri-api. Leen todos los sitios y responden 403 a quien no es superadmin.

El build de los portales ignora `superadmin/`: está excluida en `tsconfig.json`, en `eslint.config.mjs` y en el `@source` de Tailwind.

## Cómo se entra

Con Google, a través de la sesión de un sitio, que hoy es TodoMotor. La API ata cada sesión a un sitio (el `tid` del token tiene que coincidir con `X-Tenant`), así que el panel usa el cliente OAuth de ese sitio y manda `X-Tenant` en cada pedido.

Hay dos barreras:

1. **Vercel Authentication**, en todas las URLs, producción incluida. Solo entran los miembros del equipo de Vercel.
2. **La API**, que solo responde a los emails que están en `SUPERADMIN_EMAILS`. Otra cuenta de Google puede iniciar sesión, pero ve "No tenés acceso".

Por ahora solo entra el dueño: es el único miembro del equipo de Vercel y el único email en `SUPERADMIN_EMAILS`. Los admins de los portales no tienen que estar en ninguna de las dos listas. Sumar a alguien al equipo de Vercel le abre la primera barrera. Además, el código de los portales no linkea ni menciona el panel.

Ninguna página se indexa: hay `noindex` en el HTML y en el header `X-Robots-Tag`, y un `robots.txt` que bloquea todo.

## Cómo se despliega

Vercel lo construye solo cuando cambia algo en `superadmin/`. El *Ignored Build Step* es `bash ../scripts/vercel-ignore.sh superadmin`, ver [`scripts/vercel-ignore.sh`](../scripts/vercel-ignore.sh). Redeployar el mismo commit siempre construye, y si no se puede calcular el diff, también.

Variables del proyecto:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.todomotor.uy` |
| `NEXT_PUBLIC_TENANT` | `todomotor-uy` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | el cliente de Google de TodoMotor, el mismo que el proyecto `fullmotor` |

Para que funcione el botón de Google, la URL del panel tiene que estar entre los *Authorized JavaScript origins* de ese cliente, en Google Cloud. Las URLs de preview cambian en cada deploy, así que solo funciona en las URLs que estén agregadas ahí.

**La API va primero.** Sin las rutas `/api/superadmin/*` desplegadas en Railway, el panel inicia sesión pero muestra un error al cargar las métricas.

## Sumar un superadmin

Agregar el email a `SUPERADMIN_EMAILS`, en las variables de la API en Railway. Es una lista separada por comas, y el cambio toma efecto cuando la API se redespliega. No hay forma de hacerlo desde un panel.

## Probar en local

```bash
cd superadmin
npm install
cp .env.example .env.local   # completar NEXT_PUBLIC_GOOGLE_CLIENT_ID
npm run dev                  # http://localhost:3100
```

`http://localhost:3100` tiene que estar entre los orígenes autorizados del cliente de Google. Si no, levantar la API local y usar un token de prueba.
