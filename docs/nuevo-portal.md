# Levantar un portal nuevo

Guía paso a paso para poner en línea un sitio nuevo sobre Vitri. Sale de lo que hicimos con **Cardinal Sur** (ex Nauti, `cardinalsur.uy`) en noviembre de 2026. Cada paso dice dónde se hace y qué problemas aparecieron, para no volver a tropezar con lo mismo.

El orden importa: hay pasos que esperan a otros (el login de Google necesita el dominio verificado; el correo necesita el DNS en Cloudflare).

| # | Paso | Dónde | Tiempo |
|---|---|---|---|
| 1 | Elegir nombre, dominio, módulos y rubros | — | — |
| 2 | Comprar el dominio | nic.com.uy | minutos |
| 3 | Crear el sitio en la API | API + `/admin/sitio` | minutos |
| 4 | Código del front (marca, logo, tema) | este repo | horas |
| 5 | Proyecto de Vercel y variables | Vercel | minutos |
| 6 | DNS en Cloudflare y dominio en Vercel | Cloudflare + nic.com.uy + Vercel | 15 min a unas horas |
| 7 | Search Console | Google | minutos |
| 8 | App de Google para el login | Google Cloud | minutos, a veces +24 h |
| 9 | Correo `contacto@` | Cloudflare Email Routing | minutos + confirmaciones |
| 10 | Lanzamiento: abrir a buscadores | Vercel + Search Console | minutos |

---

## 1. Decidir lo básico

- **Nombre y dominio.** Mirar disponibilidad en [nic.com.uy](https://nic.com.uy) (`.uy` y `.com.uy` cuestan lo mismo: $948/año en 2026).
- **Id del sitio** (tenant): `<marca>-<país>`, por ejemplo `nauti-uy`. Es interno, va en el header `X-Tenant` y en todas las filas de la base: **no se cambia después**. Por eso Cardinal Sur sigue siendo `nauti-uy` por dentro.
- **Módulos**: `news`, `events`, `classifieds`, `storefronts`, `catalog`, `ads`.
- **Rubros** de clasificados.

## 2. Comprar el dominio (nic.com.uy)

1. Buscar el nombre, dejar tildado solo el que se quiere, **Agregar al carrito → Continuar con la compra**.
2. Pide **Cuenta Antel**: el login lo hace el dueño de la cuenta.
3. Datos del titular (tienen que ser verdaderos) y forma de pago (débito en la factura de Antel).
4. Queda **Pendiente** unos minutos y después **Registrado / ACTIVO**. Recién ahí se pueden cambiar los nameservers.

## 3. Crear el sitio en la API

Alta del tenant con la clave de admin de la API:

```bash
curl -X PUT https://api.todomotor.uy/api/admin/tenants/<id> \
  -H "Authorization: Bearer $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"brand":"<marca>","countryCode":"uy","name":"<Nombre>","defaultCurrency":"USD",
       "verticals":["nautical"],"modules":["news","events","classifieds","storefronts"]}'
```

Después, todo lo demás se edita desde **`/admin/sitio`** del propio sitio (con un usuario admin o superadmin):

- Nombre, hashtag de Instagram, módulos, rubros, duración de los avisos.
- **Solo superadmins**: dirección pública (`baseUrl`, adonde la API manda la revalidación de cache e IndexNow) y cliente de Google (`googleClientId`).

Los superadmins salen de `SUPERADMIN_EMAILS` en Railway. Los admins de cada sitio se asignan en `/admin/usuarios` después de su primer login.

## 4. Código del front

Hasta la fase 4 del plan de Vitri, la marca todavía vive en código. Para un sitio nuevo:

- [`src/lib/tenant.ts`](../src/lib/tenant.ts): agregar el `TenantId`, su `SiteConfig` (nombre, `shortName`, títulos, descripción, `defaultUrl`, email de contacto, logo, menú, `features` de respaldo) y la lógica que elige el config según `NEXT_PUBLIC_TENANT`.
- Tema: `src/app/styles/<marca>.css`, aplicado con `data-tenant` en [`layout.tsx`](../src/app/layout.tsx).
- Logo: componente en `src/app/components/<marca>/` y `public/brand/<marca>-mark.svg`. El ícono de las imágenes OG está en [`src/lib/og.tsx`](../src/lib/og.tsx).
- Portada, header y footer propios si hacen falta (ver `components/nauti/`).
- Hoy varias pantallas preguntan `IS_NAUTI` para textos y casos especiales. Para un tercer sitio hay que generalizarlo: `git grep -n IS_NAUTI src` da la lista (manifest, robots, sitemap, OG, blog, clasificados, comercios, etc.).
- [`scripts/vercel-ignore.sh`](../scripts/vercel-ignore.sh) solo conoce `todomotor` y `nauti`: sumar la marca nueva y sus carpetas exclusivas.

Probar en local con `NEXT_PUBLIC_TENANT=<id>` y `NEXT_PUBLIC_API_URL=https://api.todomotor.uy`.

## 5. Proyecto de Vercel

Un proyecto nuevo importando este repo (`todomotor-uy/vitri-web`), con el *Ignored Build Step* `bash scripts/vercel-ignore.sh <marca>`.

Variables (Production):

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.todomotor.uy` |
| `NEXT_PUBLIC_TENANT` | el id del sitio |
| `NEXT_PUBLIC_COUNTRY` | `uy` |
| `NEXT_PUBLIC_SITE_URL` | `https://<dominio>` (mientras no haya dominio, el `.vercel.app`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | el cliente del paso 8 |
| `REVALIDATE_SECRET`, `INDEXNOW_TRIGGER_SECRET` | **los mismos que tiene la API en Railway** (son uno solo para todos los sitios) |
| `INDEXNOW_KEY` | propio del sitio: `openssl rand -hex 16` |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | opcional: la meta de Search Console si se verifica por etiqueta en vez de DNS |
| `NEXT_PUBLIC_INDEXABLE` | **no ponerla hasta el lanzamiento** (paso 10) |

Un cambio de variable necesita un **Redeploy** del último deploy; el script de ignore deja pasar los redeploys del mismo commit.

Mientras el sitio no tenga dominio, queda con `noindex` y el `robots.txt` solo deja leer `/` y `/privacidad` (lo necesita Google para el login).

## 6. DNS en Cloudflare y dominio en Vercel

Usamos **Cloudflare** para el DNS porque da el reenvío de correo gratis (paso 9). La web sigue en Vercel.

1. **Vercel → proyecto → Domains**: agregar `<dominio>` y `www.<dominio>` con *redirect 308* al dominio. Los `.vercel.app` viejos también con redirect 308 al dominio.
2. **Cloudflare → Add a site → Connect a domain**, plan **Free**. Borrar los registros que importa solo y dejar:
   - `@` **CNAME** `cname.vercel-dns.com`, **DNS only** (nube gris)
   - `www` **CNAME** `cname.vercel-dns.com`, **DNS only**
   - el TXT de Search Console (paso 7)

   Con la nube naranja (proxy) Vercel no puede emitir el certificado: siempre **DNS only**.
3. **nic.com.uy → Mis dominios → Ver → Configuración servidores de nombre**: editar cada nameserver con los dos que asigna Cloudflare, terminados en punto (`xxx.ns.cloudflare.com.`).
4. El registro `.uy` publica el cambio en unos 5 a 15 minutos (`dig NS <dominio> @a.nic.uy +norec`). Cloudflare activa la zona después; en *Overview* está **Check nameservers now**.

> Alternativa sin Cloudflare: delegar a `ns1/ns2.vercel-dns.com.`. En ese caso hay que tocar **Enable Vercel DNS** en la página del dominio en Vercel; si no, los nameservers de Vercel no responden y Vercel no puede emitir el certificado.

## 7. Search Console

- Propiedad **Dominio** (`<dominio>`), verificada con el registro TXT `google-site-verification=…` en Cloudflare.
- La verificación hay que hacerla **con la misma cuenta de Google que administra el proyecto de Google Cloud** del paso 8. Si no, Google no considera el dominio "registrado" para la marca del login.

## 8. App de Google para el login

Cada sitio tiene **su propio proyecto de Google Cloud**, así el popup de login dice el nombre del sitio (“Continuar a Cardinal Sur”).

1. **Crear el proyecto** (console.cloud.google.com → New Project). La cuenta tiene un cupo de proyectos: si dice *0 projects remaining*, borrar alguno viejo o pedir más.
2. **Google Auth Platform → Get started**: nombre de la app, correo de soporte (solo ofrece la cuenta logueada), audiencia **External**, correo de contacto, aceptar la política.
3. **Clients → Create client → Web application**, *Authorized JavaScript origins*:
   `https://<dominio>`, `https://www.<dominio>`, el `.vercel.app` del proyecto y `http://localhost:3000`. El front usa el login en popup: no hacen falta redirect URIs.
4. **Branding**: página de inicio `https://<dominio>` y privacidad `https://<dominio>/privacidad`.
5. **Audience → Publish app**. Sin esto queda en *Testing* y solo pueden entrar los usuarios de prueba.
6. **Branding → Verify branding**. Si pasa, **Publish branding**. Recién ahí el popup muestra el nombre del sitio en vez del dominio.
7. Cargar el client id en Vercel (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, redeploy) **y** en `/admin/sitio` → Cliente de Google. La API solo acepta tokens del cliente configurado en el sitio: los dos tienen que coincidir.

Problemas que tuvimos con la verificación de marca:

- *"Your home page URL … is unresponsive"*: el `robots.txt` bloqueaba todo. Por eso el sitio sin lanzar deja leer `/` y `/privacidad`.
- *"The website of your home page URL … is not registered to you"*: falta verificar el dominio en Search Console (paso 7) con la cuenta del proyecto. Con un `.vercel.app` Google pide esperar 24 h después de verificarlo; con dominio propio verificado por DNS pasó en el momento.

## 9. Correo `contacto@<dominio>`

El sitio muestra `contacto@<dominio>`: tiene que llegar a los admins del sitio.

- **Cloudflare → Email Service → Email Routing → Onboard Domain**. Necesita la zona **activa** (paso 6). Agrega solo los MX (`route1/2/3.mx.cloudflare.net`) y el SPF. Esperar a que *Routing status* pase de *Syncing* a **Enabled**: lo que llega antes rebota.
- **Destination addresses**: cada destino recibe un mail de Cloudflare y tiene que confirmarlo. Las direcciones ya confirmadas en la cuenta sirven para cualquier dominio. Mientras un destino no confirma, sus reenvíos fallan con `destination address not verified` y los demás salen igual.
- Una regla reenvía a **un** destino. Para varios, un **Email Worker** (Workers & Pages → Create → Hello World), por ejemplo `<marca>-contacto`:

  ```js
  export default {
    async fetch() { return new Response("Not found", { status: 404 }); },
    async email(message) {
      const destinos = ["admin1@gmail.com", "admin2@gmail.com"];
      const r = await Promise.allSettled(destinos.map((d) => message.forward(d)));
      r.forEach((x, i) => { if (x.status === "rejected") console.error("forward failed", destinos[i], String(x.reason)); });
      if (r.every((x) => x.status === "rejected")) message.setReject("No se pudo entregar el mensaje");
    },
  };
  ```

  Y la regla **Routing rules → `contacto@<dominio>` → Send to a Worker →** el worker. Si cambian los admins, se edita la lista del worker.
- Comprobar en **Email Routing → Activity log** (tiene que decir *Forwarded*) y en **Workers → el worker → Observability** (ahí se ven los errores por destino).

Problemas que tuvimos:

- **Forward Email gratis no sirve**: bloquea los dominios `.uy` ("Emails blocked via abuse prevention").
- **Cambio de nameservers con correo andando**: el `.uy` publica los NS con TTL de 24 h, así que durante un día algunos servidores siguen preguntando al DNS anterior. Si el dominio estaba en Vercel DNS, copiar ahí también los MX de Cloudflare (con prioridad más alta) hasta que expire.

## 10. Lanzamiento

1. **Borrar el contenido de demo** (novedades, eventos, clasificados; los comercios se suspenden desde `/admin/comercios`) y revalidar la cache.
2. `NEXT_PUBLIC_INDEXABLE=1` en Vercel y redeploy: saca el `noindex` y abre el `robots.txt`.
3. **Search Console → Sitemaps**: enviar `https://<dominio>/sitemap.xml`.

## Comprobaciones

```bash
U=https://<dominio>
curl -s -o /dev/null -w "%{http_code}\n" $U/                     # 200
curl -s $U/robots.txt                                              # Allow: / al lanzar
curl -s $U/ | grep -o '<meta name="robots"[^>]*>'                  # index, follow al lanzar
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://www.<dominio>/   # 308 al dominio
# Revalidación (el mismo secreto que la API):
curl -s -X POST -H "x-api-key: $REVALIDATE_SECRET" -H "Content-Type: application/json" -d '{}' $U/api/revalidate
# La API ve el sitio con su URL y nombre:
curl -s -H "X-Tenant: <id>" https://api.todomotor.uy/api/meta/tenant | jq '.data|{name,baseUrl}'
dig +short NS <dominio>; dig +short MX <dominio>
```

Y a mano: iniciar sesión con Google en el dominio (el popup tiene que decir el nombre del sitio) y entrar a `/admin/sitio`.
