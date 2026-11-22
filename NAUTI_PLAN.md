# Nauti — plan de proyecto

Portal de náutica uruguaya en **nauti.uy**: blog + clasificados (lanchas, veleros,
motos de agua, motores, equipamiento) + directorio de náuticas/brokers. Sin fichas
técnicas de 0 km. Sale de TodoMotor y reutiliza su backend.

Estado: plan, nada implementado. Fecha: 2026-11-22.

---

## 1. Lo que hay hoy (relevado)

**Backend — `fullmotor_api`** (Go + Fiber + GORM, Railway, proyecto "Todo Motor")
- Servicios: `fullmotor_api` y `pgvector` (Postgres). Uso últimos 7 días: API ~30 MB
  RAM y CPU casi 0; DB ~105 MB RAM, 0,3 GB disco. **Sobra capacidad** para un segundo sitio.
- Ya es multi-tenant **por país**: `blog_posts`, `classifieds` y `dealerships` tienen
  `country_code`, y las lecturas filtran por el header `X-Country`.
- Ya existe el concepto de "portal" `vehicle_types` con `nautical`
  (boats, sailboats, jet_skis, yachts), pero solo lo usan los vehículos, no blog ni clasificados.
- `users` es **global** (único por `google_id` / `email`). `role` (admin) es global.
- `dealerships`: una por usuario (`user_id` único), único `(country_code, slug)`.
- Login Google: valida `aud == GOOGLE_CLIENT_ID` (**un solo client ID**).
- Revalidación de caché e IndexNow resuelven el front por país: `SITE_URL_UY`.
- Categorías de clasificados: whitelist fija en Go (`cars`, `motorcycles`, `trucks`,
  `parts`, `accessories`, `other`) + campos de vehículo (`year`, `mileageKm`, `brand`,
  `model`, `fuelType`, `transmission`).
- Comentarios: genéricos por `resourceId` (UUID), no dependen del tenant.
- Imágenes: Vercel Blob con un token compartido.
- CORS: `*`.

**Frontend — `fullmotor`** (Next.js 16, Vercel, proyecto `fullmotor`)
- Marca hardcodeada en ~42 archivos (`SITE_NAME`, metadata, JSON-LD, header, footer, OG).
- Módulos reutilizables: auth (`AuthProvider`, `lib/auth.ts`), blog (`lib/blog.ts`,
  `BlogCard`, `InfiniteBlogList`, RSS, OG), clasificados (`classifieds-api.ts`,
  `ClassifiedForm/Filters/Card/Gallery/ImageUploader`, `/clasificados/*`),
  automotoras, comentarios, admin (`/admin/*`), consentimiento/analytics.
- Específico de autos (no va a Nauti): `/vehiculos`, `/vehiculo/[slug]`, `/marcas`,
  `/compare`, `/guia-de-compra`, guardados, ads de la guía, middleware de slugs.

**Otros activos**
- Vercel Pro (team `santicastillos-projects`) con 8 proyectos, incluido `navega-uy`
  (condiciones para navegar + wiki de vela, repo `navega`) — material directo para Nauti.
- Cloudflare: el MCP disponible es el de Workers bindings (deprecado); DNS/Email Routing
  se harán por dashboard o la API de Cloudflare.
- Vercel no registra `.uy`: el dominio se compra en NIC Uruguay (Antel) o un revendedor.

---

## 2. ¿Reutilizar o proyecto separado?

| | A. Backend compartido + front en el mismo repo (2º proyecto Vercel) | B. Backend compartido + repo de front nuevo | C. Todo separado (API + DB + front nuevos) |
|---|---|---|---|
| Costo extra mensual | ~0 (Railway ya corre; Vercel Pro no cobra por proyecto) | ~0 | +1 servicio API +1 Postgres en Railway (~USD 5–15/mes) |
| Esfuerzo inicial | Medio: hacer el front "site-aware" | Medio: copiar/adaptar módulos | Alto: forkear API, sacar vehículos, migraciones, admin, skills |
| Mantenimiento | Un fix en blog/clasificados/auth sirve a ambos | Fixes duplicados en el front | Todo duplicado, para siempre |
| Riesgo | Un cambio puede romper el otro sitio; fugas de datos entre sitios si un query no filtra | Igual en backend | Aislamiento total |
| Diseño propio | Por config + tokens + home propia | Libre | Libre |

**Recomendación: A.**
- El backend es lo que más vale reutilizar (auth, blog, clasificados, imágenes,
  moderación, automotoras, comentarios, admin) y ya tiene el patrón de tenant y
  capacidad de sobra. Separarlo duplica todo para ahorrar poco riesgo.
- El front de Nauti es un **subconjunto** del de TodoMotor (blog + clasificados +
  directorio) con otra marca y otra home. Un segundo proyecto Vercel apuntando al
  mismo repo, con `NEXT_PUBLIC_TENANT=nauti-uy`, da env vars, dominio, caché y analytics
  propios sin pagar nada más.
- Salida de emergencia: si los productos divergen mucho, se pasa a monorepo
  (`apps/todomotor`, `apps/nauti`, `packages/shared`) sin tocar el backend.

Nota sobre "solo apuntar un dominio": un único proyecto Vercel sirviendo dos hosts
es posible, pero las `NEXT_PUBLIC_*` son de build (un solo Google client ID, GA ID,
nombre de sitio) y habría que hacer todo por host en runtime. Dos proyectos del mismo
repo da lo mismo con mucho menos trabajo.

---

## 3. Diseño

### 3.1 Backend: tenant genérico (implementado en `fullmotor_api`, rama `claude/generic-tenants`)

**Auditoría (2026-11-22)**: TodoMotor *no* era multi-tenant de verdad. Era
multi-país a medias:
- Tres formas distintas de resolver el país: `TenantMiddleware` (validado) en
  blog/catálogo, `c.Get("X-Country")` crudo en clasificados y automotoras, y
  `countryCode` del body en los create, sin chequear contra el header.
- Sin ningún scope: `/classifieds/mine`, `/classifieds/:id`, comentarios, listas
  de `/ops`, lookups admin del blog por slug, aprobación de automotoras.
- Comentarios colgados de un slug global: el mismo slug de post en dos sitios
  compartiría el hilo.
- Un único `GOOGLE_CLIENT_ID`, una automotora por usuario, revalidación e
  IndexNow por `SITE_URL_<PAIS>`, moneda por defecto `USD` fija.

**Modelo**: un *tenant* es **marca + país** con su dominio (`todomotor-uy`,
`todomotor-ar`, `nauti-uy`). Tabla `tenants`:
`id, brand, country_code, name, base_url, locale, default_currency,
google_client_id, verticals[], active`.

- **Resolución por request** (`SiteTenantMiddleware`, en todo `/api`):
  `X-Tenant` → si no, `todomotor-<X-Country>` → si no, `DEFAULT_TENANT`
  (default `todomotor-uy`). Tenant desconocido → 400; inactivo → 404. Los
  clientes actuales (que mandan solo `X-Country` o nada) siguen igual.
- **`tenant_id`** en `blog_posts`, `classifieds`, `dealerships`, `comments`.
  Backfill `todomotor-<country_code>`; comentarios heredan el tenant de su recurso.
  Agregado antes del AutoMigrate (si no, el `NOT NULL` lo rompe con datos).
- **Seed**: un tenant `todomotor-<país>` por cada fila de `countries`, con el
  mismo `active`; `verticals` = tipos de vehículo que ya tiene el catálogo de ese
  país; `base_url` desde `SITE_URL_<PAIS>`. Nunca sobrescribe ediciones.
- **Índices únicos**: blog `(tenant_id, slug)`, automotoras `(tenant_id, slug)` y
  `(user_id, tenant_id)` — un usuario puede tener una automotora por sitio. Los
  viejos se borran solo después de existir los nuevos.
- **Scope por tenant**: blog (público, admin, Instagram), clasificados (lista,
  detalle, `mine`, alta, moneda por defecto), automotoras (alta, lista, slug,
  revisión, beneficios de no-vencimiento), comentarios, moderación `/ops`, y la
  automotora que se carga en la sesión.
- **Escrituras de máquina** (pipeline del blog, skills): sin `X-Tenant`, el
  `countryCode` del body elige `todomotor-<país>` como antes; con `X-Tenant`, el
  body tiene que coincidir.
- **Google**: el `aud` del token tiene que ser el client del tenant
  (`tenants.google_client_id`, fallback `GOOGLE_CLIENT_ID`). JWT con claim `tid`;
  un token de un sitio es rechazado en otro (los tokens viejos sin `tid` valen hasta vencer).
- **Revalidación / IndexNow**: por `tenant.base_url`, fallback `SITE_URL_<PAIS>`.
  Un vehículo refresca todos los tenants de su país que cubren su vertical.
- **Catálogo**: sigue por país; el país sale del tenant si no viene `X-Country`.
- `GET /api/meta/tenant` devuelve el tenant resuelto. CORS acepta `X-Tenant`.
- Arranque: si no puede cargar tenants o falta el default, el API no levanta
  (el health check pasaría y todas las requests fallarían).

**Verificado**: `go vet`, suite completa, tests nuevos de resolución, escritura,
JWT cruzado y URLs; migración probada en Postgres 15 local con datos con la forma
de producción (backfill, swap de índices, nuevas reglas de unicidad, idempotencia)
y en base vacía. **No probado**: `Migrate()` completo con pgvector ni contra una
copia de producción.

**Pendiente (Fase 1b)**:
- Ads (`?country=`) e Instagram (una cuenta por país) → por tenant.
- Categorías y facets de clasificados por vertical del tenant (Fase 2).
- Catálogo con `X-Vehicle-Type: all` restringido a `verticals`.
- Update/delete/renew de clasificados solo validan dueño, no tenant.
- `/admin/seed` no crea tenants; la caché de tenants solo se recarga al reiniciar
  (alta de `nauti-uy` = insert + redeploy, o endpoint admin).
- Roles globales (un admin lo es en todos los sitios).

**Alta de un tenant nuevo** (ej. Nauti):
```sql
INSERT INTO tenants (id, brand, country_code, name, base_url, locale,
  default_currency, google_client_id, verticals, active, created_at, updated_at)
VALUES ('nauti-uy', 'nauti', 'uy', 'Nauti', 'https://nauti.uy', 'es',
  'USD', '<client id de Google>', '{nautical}', true, NOW(), NOW());
```
y reiniciar el servicio.

**Frontend (auditoría, se resuelve en Fase 3)**: marca escrita a mano en ~42
archivos; `NEXT_PUBLIC_COUNTRY || 'uy'` en 4 módulos; formato fijo `es-UY`;
monedas fijas en form y filtros; token en `localStorage` como `todomotor_token`;
`fetchCurrentUser` y el login no mandan header de tenant. El front de cada
tenant tiene que mandar `X-Tenant` en **todas** las llamadas.

**Dominio de API**: agregar `api.nauti.uy` como custom domain del mismo servicio
Railway. **Blob**: mismo store, prefijo por tenant.

### 3.2 Backend: clasificados náuticos

Registro de categorías **por sitio** en vez de la whitelist única:

| id | Etiqueta |
|---|---|
| `motorboats` | Lanchas y cruceros |
| `sailboats` | Veleros |
| `jetskis` | Motos de agua |
| `small_craft` | Kayaks, SUP y botes |
| `engines` | Motores (fuera de borda / intraborda) |
| `trailers` | Trailers |
| `equipment` | Equipamiento y electrónica |
| `moorings` | Amarres y guarderías |
| `services` | Servicios (mecánica, pintura, velería, escuelas) |
| `other` | Otros |

Atributos estructurados: en vez de seguir sumando columnas nulleables, una columna
**`attributes jsonb`** validada en Go según un esquema por categoría (índice GIN para
filtros). Campos para embarcaciones:

- `year`, `brand` (astillero), `model`, `lengthFt` (eslora), `beamM` (manga),
  `hullMaterial` (fibra, aluminio, madera, PRFV…), `propulsion` (fuera de borda,
  intraborda, vela, a remo), `engineBrand`, `engineHp`, `engineHours`, `fuelType`,
  `berths` (cuchetas), `homePort` (Buceo, Punta del Este, Piriápolis, Colonia,
  Carmelo, Santiago Vázquez, La Paloma, …), `hasTrailer`.
- Motores: `brand`, `hp`, `hours`, `strokes` (2T/4T), `shaft` (corto/largo).
- Facets nuevos: marcas de astilleros y motores (Yamaha, Mercury, Suzuki, Honda,
  Evinrude, Tohatsu…), puertos.

Los campos de auto existentes se quedan como están para TodoMotor.

### 3.3 Frontend: site-aware en el repo `fullmotor`

- **`src/sites/`**: `todomotor.ts`, `nauti.ts`, `index.ts` exporta `SITE` según
  `NEXT_PUBLIC_SITE`. Cada config: nombre, URL, logo, email de contacto, textos SEO,
  nav del header/footer, categorías de clasificados y labels, features habilitadas
  (`vehicles`, `guide`, `compare`, `brands`, `saved`, `ads`, `dealerships`).
- **Reemplazar los hardcodes** (`SITE_NAME`, metadata de `layout.tsx`, JSON-LD,
  RSS, OG, manifest, robots, sitemap) por `SITE.*`. TodoMotor tiene que quedar
  byte a byte igual: verificar con build + comparación de HTML de home, blog y clasificados.
- **Headers de API**: un único helper que agrega `X-Tenant` y lo usan `lib/api.ts`,
  `auth.ts`, `blog.ts`, `classifieds-api.ts`, `dealerships-api.ts`, `comments.ts`,
  `ops-api.ts`. La config del sitio sale de `NEXT_PUBLIC_TENANT` (+ `GET /api/meta/tenant`).
- **Gating de rutas**: middleware que devuelve 404 en Nauti para `/vehiculos`,
  `/vehiculo/*`, `/marcas/*`, `/compare`, `/guia-de-compra`, `/guardados`; el
  sitemap solo lista lo habilitado.
- **Home de Nauti** (`src/app/page.tsx` despacha a `HomeTodoMotor` / `HomeNauti`):
  hero, últimos clasificados destacados, blog, categorías náuticas, directorio de
  náuticas, y opcionalmente el widget "¿se puede salir hoy?" de `navega`.
- **Tema**: tokens de color/tipografía por sitio (`styles/tokens/*` con
  `[data-site="nauti"]`), logo y favicon propios.
- **Clasificados**: `ClassifiedForm` y `ClassifiedFilters` renderizan los campos
  desde el esquema de la categoría (en vez de `categoryHasVehicleFields`), con labels
  en español por sitio. "Automotoras" → "Náuticas" en Nauti (`/nauticas`).
- **Legales**: privacidad y política publicitaria propias de Nauti (Google las pide
  para la pantalla de consentimiento).

### 3.4 Infra

| Pieza | Acción |
|---|---|
| Dominio | Comprar `nauti.uy` (NIC Uruguay / revendedor). Delegar NS a Cloudflare. |
| Cloudflare | Zona `nauti.uy`: apex + `www` → Vercel (DNS only, sin proxy); `api` → Railway (CNAME DNS only); Email Routing `contacto@nauti.uy` → tu Gmail; TXT de Search Console. |
| Vercel | Proyecto nuevo `nauti` con el mismo repo `santi-castillo/fullmotor`. Env: `NEXT_PUBLIC_TENANT=nauti-uy`, `NEXT_PUBLIC_SITE_URL=https://nauti.uy`, `NEXT_PUBLIC_API_URL=https://api.nauti.uy`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (nuevo), `NEXT_PUBLIC_GA_ID` (nuevo), secretos. Dominios `nauti.uy` + `www` → redirect. Ignored Build Step opcional para no buildear Nauti por cambios solo de autos. |
| Railway | Custom domain `api.nauti.uy` en `fullmotor_api`. Vars: `GOOGLE_CLIENT_IDS`, `SITE_URL_NAUTI_UY`. Backup de la DB antes de la migración. |
| Google Cloud | **Proyecto GCP nuevo "Nauti"** (la pantalla de consentimiento es por proyecto, así el login dice "Nauti"). OAuth client web con orígenes `https://nauti.uy`, `https://www.nauti.uy`, `http://localhost:3000`. Solo scopes básicos (openid/email/profile): no requiere verificación sensible, sí verificación de marca para mostrar logo. |
| Medición | Propiedad GA4 y Search Console nuevas; Vercel Analytics viene con el proyecto. |

---

## 4. Fases

**Fase 0 — Prerrequisitos (vos)**
- Comprar `nauti.uy`, crear zona en Cloudflare.
- Definir nombre/logo/paleta (o placeholder).
- Responder las preguntas abiertas (§6).

**Fase 1 — Backend tenant genérico** (rama `claude/generic-tenants` en `fullmotor_api`)
1. ✅ Modelo `Tenant`, seed, caché y `SiteTenantMiddleware`.
2. ✅ `tenant_id` + backfill + índices (probado en Postgres local).
3. ✅ Scope por tenant en blog, clasificados, automotoras, comentarios, `/ops`.
4. ✅ Google client por tenant, claim `tid`, automotora por tenant en `/auth/me`.
5. ✅ Revalidación/IndexNow por `base_url` del tenant.
6. ⏳ Probar `Migrate()` completo contra una copia de la DB de producción (backup antes).
7. ⏳ Fase 1b (ver §3.1) y `openapi.yaml`.
- *Criterio de hecho*: TodoMotor en producción sin cambios de comportamiento; con
  `X-Tenant: nauti-uy` todo devuelve vacío.

**Fase 2 — Backend clasificados náuticos**
1. Registro de categorías por sitio, `attributes jsonb` + validación + GIN.
2. Facets por sitio (marcas de astilleros/motores, puertos).
3. Endpoint de esquema de categorías (para que el form del front se arme solo).

**Fase 3 — Front site-aware** (PR en `fullmotor`)
1. `src/sites/*` (config por tenant) y reemplazo de hardcodes; header `X-Tenant` en todas las llamadas.
2. Regresión TodoMotor (build + HTML de páginas clave).
3. Gating de rutas, sitemap/robots/RSS/OG/manifest por sitio.
4. Tema y logo Nauti; home Nauti.
5. Formulario y filtros de clasificados por esquema; "Náuticas".
6. Legales de Nauti.

**Fase 4 — Infra y salida**
1. Vercel `nauti`, env vars, preview en `*.vercel.app`.
2. GCP + OAuth, probar login en preview.
3. DNS Cloudflare, `api.nauti.uy` en Railway, dominio en Vercel.
4. GA4, Search Console, sitemap enviado.
5. Contenido inicial: 10–15 posts y skill de blog con `site: nauti`
   (adaptar `todomotor-blog`); invitar náuticas/brokers a publicar (sin avisos inventados).

**Fase 5 — Después del lanzamiento**
- Integrar `navega` (condiciones y wiki de vela) dentro de Nauti.
- Directorio de marinas/guarderías con mapa.
- Clasificados destacados pagos (MercadoPago ya está integrado en el backend).

---

## 5. Riesgos

- **Fuga entre sitios**: un query sin filtro de `site` muestra autos en Nauti o
  viceversa. Mitigación: default explícito + tests de aislamiento por endpoint.
- **Regresión en TodoMotor** por el refactor del front. Mitigación: Fase 3 paso 2
  antes de tocar nada visual de Nauti.
- **Migración de índices únicos** en producción: hacerla en una copia primero, con backup.
- **Acoplamiento de deploys**: un deploy del backend afecta a ambos sitios. Aceptable
  con el tráfico actual; health check de Railway ya existe.
- **Admin global**: un admin de TodoMotor es admin de Nauti. Hoy sos vos solo; si se
  suman editores, pasar a roles por sitio.

---

## 6. Preguntas abiertas

1. **Cuentas**: ¿la misma cuenta Google debe ser el mismo usuario en ambos sitios
   (recomendado: más simple; la política de privacidad tiene que decir que el
   operador es el mismo) o usuarios totalmente separados por sitio?
2. **Moneda**: ¿clasificados náuticos en USD por defecto (como autos)?
3. **Directorio**: ¿"Náuticas" incluye solo vendedores/brokers o también servicios
   (guarderías, mecánicos, escuelas)? Define si se reutiliza `dealerships` tal cual.
4. **Vencimiento**: ¿30 días como en autos? Las embarcaciones tardan más en venderse;
   60–90 días puede tener más sentido.
5. **Navega**: ¿se integra a Nauti desde el arranque o en Fase 5?
