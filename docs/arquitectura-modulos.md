# Arquitectura de módulos: separar la lógica de cada portal

Propuesta de diseño para las fases 3 (campos propios por rubro) y 4 (el front lee la configuración desde la API) de Vitri. **Es solo análisis: nada de esto está implementado.** Relevado el 2026-11-27 sobre `master` de vitri-web y `origin/main` de vitri-api (último commit `326d175`).

**Resumen.** Recomiendo organizar el código **por módulo y no por portal**. Un portal es un tenant: datos en la BD, más un tema visual. Lo que hoy parece "de TodoMotor" o "de Cardinal Sur" es, casi todo, un módulo o un texto disfrazado de marca. Lo que es realmente único de un portal también se escribe como módulo, aunque esté prendido en un solo sitio. La lista de módulos prendidos sale de un solo lugar, `tenants.modules` en la API: el front y el script de Vercel la leen de ahí, y desaparece `SITE_CONFIG.features`.

---

## 1. Inventario: qué es propio de un portal hoy

### Lo que ya está bien resuelto

Antes del inventario conviene ver lo que ya funciona, porque la propuesta se apoya en eso:

- **API.** `tenants.modules` es la fuente de verdad de los módulos. `middleware.RequireModule` devuelve 404 en las rutas públicas y `/ops` de un módulo apagado (`cmd/api/main.go`, `mod(models.ModuleX)`). Los rubros, la duración de los avisos y la marca `vehicleFields` por rubro son datos del tenant (`internal/models/site_settings.go`).
- **Front.** `getSiteSettings()` (`src/lib/site-settings.server.ts`) lee `GET /api/meta/tenant`. Cada sección se protege con `requireModule()` en su `layout.tsx`, y el menú, el footer y el panel de admin filtran por módulo.

El problema no es la llave del módulo. Son tres cosas que todavía viven en código:

1. la **identidad** del sitio (`SITE_CONFIG`, `IS_NAUTI`);
2. una **copia estática** de los módulos que se puede desincronizar (`SITE_CONFIG.features`);
3. el **mapa de qué carpeta es de quién**, escrito a mano (`scripts/vercel-ignore.sh`).

### vitri-web

| Qué | Dónde | Clasificación | Comentario |
|---|---|---|---|
| Catálogo de vehículos: fichas, listado, marcas, búsqueda | `src/app/{vehiculo,vehiculos,marcas}/`, `src/lib/{api,catalog,data,vehicle-*}.ts`, `src/types/vehicle.ts`, `src/app/actions/search.ts`, `src/app/api/vehicles/`, componentes `VehicleList`, `VehicleFilters`, `InventoryToolbar`, `CatalogPagination`, `BrandStrip`, `CategoryGrid`, `HeroSection`, `PremiumListings`, `HeaderSearch`, `SearchBar` | **Genérico disfrazado** | Es el módulo `catalog`. Lo puede usar cualquier portal de autos o motos, como un `todomotor-ar` o un portal de motos. No sirve para barcos: el modelo `Vehicle` es automotor. Es "de una vertical", no "de una marca". |
| Comparador | `src/app/compare/`, `CompareAdd` | Genérico disfrazado | Parte de `catalog`. |
| Guardados | `src/app/guardados/`, `Saved*` | Genérico disfrazado | Hoy guarda vehículos del catálogo. Podría guardar avisos en cualquier sitio, pero eso es otra funcionalidad. |
| Guía de compra | `src/app/guia-de-compra/`, `src/lib/buying-guide/`, `src/data/buying-guide/` (datos ACAU 2026), `components/guide/`, `GuideCta`, `scripts/guide-*.ts`, `scripts/acau-import.ts` | **Mitad y mitad** | El mecanismo (asistente de preguntas, puntaje, podio) es genérico. Las preguntas, el puntaje y los datos de ventas de ACAU son del mercado automotor uruguayo. Queda dentro de `catalog`, separado en su subcarpeta. |
| Historial de precios | `PriceHistory`, `src/lib/price-history.ts` | Genérico disfrazado | Parte de `catalog`. |
| Redirecciones de slugs de vehículos | `src/middleware.ts`, `src/lib/vehicle-slug-redirects.ts` | Propio de `catalog` | Es el único middleware que hay. |
| Imágenes del catálogo en el panel | `src/app/admin/page.tsx` (la sección "Imágenes") | Propio de `catalog` | Hoy `/admin` es esa pantalla, y el panel redirige si el sitio no tiene catálogo. |
| Publicidad | `src/app/components/ads/`, `src/app/api/promos/`, `styles/ads.css`, `scripts/ads-check.ts` | **Genérico** | El módulo `ads`. Varios espacios (`guide-band`, la ficha, las marcas) viven en páginas de `catalog`: `ads` se *engancha* en `catalog` pero no depende de él. |
| Portada de TodoMotor | `src/app/page.tsx` | Composición propia del sitio | Son bloques de `catalog`, `news` y `ads` en un orden. Tiene el email `contacto@todomotor.uy` fijo en el JSON-LD (debería salir de `SITE_CONFIG.contactEmail`). |
| Portada de Cardinal Sur | `components/nauti/NautiHome.tsx` | **Genérico disfrazado** | Es una portada de "contenidos + mercado" con bloques de `news`, `events` y `classifieds`, y sirve para cualquier sitio sin catálogo. Lo único náutico es `CATEGORY_ICONS`: el ícono de cada rubro, que debería ser un dato del rubro (fase 3). |
| Header, footer y menú móvil de Cardinal Sur | `components/nauti/Nauti{Header,Footer,MobileNav}.tsx` | Variante de presentación | Son otra versión del header, sin buscador de vehículos. Hay que convertirlos en una variante elegida por tema, no por marca. |
| Logo y tema de Cardinal Sur | `NautiLogo.tsx`, `styles/nauti.css`, `public/brand/nauti-*` | **Único de un portal** | Es presentación pura, y es legítimo que sea propio de cada sitio. |
| Textos con `IS_NAUTI` | `blog/page.tsx`, `blog/rss.xml`, `blog/opengraph-image.tsx`, `clasificados/page.tsx`, `ClassifiedForm.tsx` (placeholders), `comercios/*`, `admin/comercios`, `admin/blog` y `AdminShell` ("Novedades" o "Blog"), `not-found.tsx`, `layout.tsx` (descripción OG, ícono), `manifest.ts`, `opengraph-image.tsx`, `lib/og.tsx` (color, logo) | **Configuración disfrazada** | Son textos y colores. Dependen de la **vertical** (náutica o automotor) o de la **marca**, nunca de la lógica. Van a la configuración del tenant (fase 4). |
| `robots.ts` y `layout.tsx`: `IS_NAUTI && !INDEXABLE` | | Genérico disfrazado | "Sitio sin lanzar" vale para cualquier sitio nuevo: tiene que ser `NEXT_PUBLIC_INDEXABLE` en todos los proyectos, o un estado `launched` del tenant. |
| `sitemap.ts`: `if (IS_NAUTI) return nautiSitemap()` | | Genérico disfrazado | Tendría que ser la suma de lo que aporta cada módulo prendido. |
| `ClassifiedFilters.tsx`: `!IS_NAUTI && [cars, motorcycles, trucks]` | | **Bug latente** | Ya existe `categoryHasVehicleFields(settings, key)`. Con un rubro de vehículos nuevo, o un tercer sitio, este filtro falla. |
| `FALLBACK_SETTINGS.categories` por `IS_NAUTI` | `src/lib/site-settings.ts` | Copia de la API | Son los mismos rubros iniciales que `DefaultListingCategories` en Go: una segunda copia. |
| `SITE_CONFIG.features` | `src/lib/tenant.ts` | **Llave duplicada** | Ver la sección 3. |
| `vercel-ignore.sh` | `scripts/` | **Mapa a mano** | Ver la sección 4. |

### vitri-api

La API está bastante más limpia: no hay lógica por marca en los handlers. Lo que menciona marcas es de arranque y migración (`internal/database/tenants.go`: siembra de `todomotor-<país>`, el *backfill* de módulos por vertical, el hashtag "TodoMotor"), y está bien que siga ahí.

| Qué | Dónde | Módulo | Comentario |
|---|---|---|---|
| Vehículos (CRUD, embeddings, versiones relacionadas) | `handlers/vehicles.go` (845 líneas), `models/vehicle.go`, `cmd/generate_embeddings` | `catalog` | Las rutas `/api/admin/vehicles*` las usan las rutinas de TodoMotor. **No se tocan.** |
| Historial de precios | `handlers/vehicle_price_history.go`, `models/vehicle_price_history.go` | `catalog` | Se escribe desde `UpdateVehicle`. |
| Búsqueda, filtros, carrusel, imágenes de vehículos | `handlers/{search,filters,carousel,images}.go` | `catalog` | |
| `TenantMiddleware` (`X-Country` + `X-Vehicle-Type`) | `middleware/tenant.go` | `catalog` | En realidad es un filtro del catálogo (lo dice el propio código). Está montado como grupo `api.Group("")` al final, y por eso **el orden de registro importa**. |
| Campos de vehículo en clasificados | `handlers/classified_vehicle_fields.go`, columnas `year`, `mileage_km`, `brand`… en `models/classified.go` | `classifieds` | Genérico disfrazado: es el primer "juego de campos por rubro". La fase 3 lo generaliza (`fieldset: "vehicle"`, mañana `"boat"`). La lista de marcas es automotriz. |
| Publicidad | `internal/ads/`, `handlers/ads*.go` (5 archivos, ~2.100 líneas), 6 modelos `Ad*` | `ads` | Genérico. Los *placements* están en código y espejados en el front (`ads:check`). Varias secciones (`inventory`, `brand`, `detail`, `guide`) son páginas de `catalog`. |
| Comercios | `handlers/dealerships{,_admin}.go`, `models/dealership.go` | `storefronts` | Genérico. |
| Novedades e Instagram | `handlers/blog*.go`, `instagram*.go`, `scheduled_publish.go`, `services/{instagram*,markdown,sponsored_links}.go` | `news` | Genérico. |
| Eventos | `handlers/events.go`, `models/event.go` | `events` | Genérico y chico: el mejor candidato para el piloto. |
| Clasificados, pagos, purga | `handlers/{classifieds,moderation_admin,payments,maintenance}.go`, `services/mercadopago.go` | `classifieds` | Genérico. |
| Tenants, sitio, auth, usuarios, roles, comentarios, ubicación | `handlers/{tenants,site_settings,auth,users_admin,comments,location}.go` | **núcleo** | No son módulos: los usan todos. |

**Conclusión del inventario.** En los dos repos, lo "único de un portal" se reduce a presentación: logo, colores, tipografía y, si hace falta, una variante de header o portada. Todo lo demás es un módulo genérico, un módulo de vertical (catálogo de vehículos, guía de compra) o texto que tiene que ser configuración.

---

## 2. Estructura propuesta

### Alternativas evaluadas

| | Por portal (`src/sites/todomotor/`) | **Por módulo (`src/modules/catalog/`)** | Híbrido: módulos + `src/sites/<portal>/` con lógica |
|---|---|---|---|
| Reuso | Malo: el catálogo queda "de TodoMotor" y un `todomotor-ar` o un portal de motos lo tiene que importar desde la carpeta de otro sitio. | Bueno: un módulo se prende en cualquier tenant. | Medio: cada sitio termina con su rincón de excepciones. |
| Regla "nada atado a una marca" | La rompe por diseño. | La cumple: la marca es dato. | Abre la puerta de nuevo. |
| Prender un módulo desde `/admin/sitio` | No encaja: el código está repartido por sitio. | Encaja 1 a 1 con `tenants.modules`. | Encaja a medias. |
| Ignored Build Step de Vercel | Fácil (carpeta = sitio). | Se deduce: carpeta = módulo y módulo prendido = sitio afectado. | Las dos cosas. |
| Riesgo | Se convierte en forks dentro del repo. | Hay que mantener un registro de módulos. | El peor de los dos. |

**Recomendación: por módulo**, con una capa delgada de **temas** que es solo presentación (CSS, logo, variante de header y footer, y la composición de la portada). El tema lo elige el tenant (`theme: "cardinalsur"`), no `IS_NAUTI`. Una funcionalidad realmente única de un portal se escribe igual como módulo; que la use un solo sitio es un dato de la BD, no una carpeta con su nombre.

### Árbol de vitri-web

Next.js obliga a que las rutas vivan en `src/app/`. Para que "una ruta exista solo si el módulo está prendido" sin cambiar ninguna URL se usan **grupos de rutas**: una carpeta `(catalog)` no aparece en la URL, y su `layout.tsx` hace `requireModule('catalog')` una sola vez para todas las páginas que tiene adentro. Hoy hay diez `layout.tsx` que hacen ese mismo trabajo, uno por sección. El layout raíz sigue siendo uno solo, así que no hay recargas completas entre grupos.

```
src/
├── app/                                  # solo rutas: páginas delgadas
│   ├── layout.tsx                        # lee settings + tema; sin IS_NAUTI
│   ├── page.tsx                          # portada: arma los bloques que pide el tema
│   ├── not-found.tsx, robots.ts, manifest.ts, opengraph-image.tsx
│   ├── sitemap.ts                        # suma moduleSitemaps() de los módulos prendidos
│   ├── privacidad/, politica-publicitaria/
│   ├── (catalog)/
│   │   ├── layout.tsx                    # await requireModule('catalog')
│   │   ├── vehiculo/, vehiculos/, marcas/, compare/, guia-de-compra/, guardados/
│   │   └── api/vehicles/route.ts         # rutas de API también entran en grupos
│   ├── (news)/      layout.tsx + blog/
│   ├── (events)/    layout.tsx + eventos/
│   ├── (classifieds)/ layout.tsx + clasificados/
│   ├── (storefronts)/ layout.tsx + comercios/
│   ├── (ads)/       api/promos/          # sin layout: requireModule en cada route.ts
│   ├── admin/                            # el panel: arma sus secciones desde el registro
│   └── api/revalidate/, api/upload/, api/indexnow/   # núcleo
├── modules/
│   ├── registry.ts                       # lista de FrontModule; el único lugar que los importa a todos
│   ├── types.ts                          # FrontModule, ModuleName (ver abajo)
│   ├── catalog/
│   │   ├── index.ts                      # manifiesto (se puede usar en cliente)
│   │   ├── server.ts                     # sitemap(), bloques de portada (solo servidor)
│   │   ├── components/                   # VehicleList, VehicleFilters, HeroSection, BrandStrip…
│   │   ├── lib/                          # api.ts, catalog.ts, data.ts, vehicle-*.ts, slug-redirects.ts
│   │   ├── compare/, saved/, price-history/
│   │   └── guide/                        # buying-guide: lib, data ACAU, componentes
│   ├── news/        index.ts, server.ts, components/ (Blog*, editor), lib/ (blog*.ts)
│   ├── events/      …
│   ├── classifieds/ … + fields/          # fase 3: un renderer por fieldset ("vehicle", "boat")
│   ├── storefronts/ …
│   └── ads/         components/ (AdSlot…), placements.ts, ads.css
├── themes/
│   ├── registry.ts                       # id de tema -> { css, Logo, Header, Footer, homeBlocks }
│   ├── default/                          # el look de TodoMotor, que pasa a ser el tema base
│   └── cardinalsur/                      # nauti.css, NautiLogo, variante de header y footer
├── core/  (o lib/ y components/ como hoy)  # auth, permisos, site-settings, ui/, tenant.ts reducido
└── scripts/
    ├── site-snapshot.ts                  # prebuild: copia /api/meta/tenant a .vitri/site.json
    └── modules-check.ts                  # contrato front <-> API (como ads:check)
```

Reglas:

- `modules/<m>/` puede importar de `core/` y nunca de otro módulo. Si `news` quiere mostrar los vehículos mencionados en una nota (`blog-mentions`), lo pide por el registro (`registry.get('catalog')?.mentionResolver`) y solo si `catalog` está prendido, como ya hace hoy con `hasModule`.
- Cada módulo exporta un manifiesto:

```ts
// src/modules/types.ts
export interface FrontModule {
  id: ModuleName                         // el mismo string que tenants.modules
  label: string
  requires?: ModuleName[]                // p. ej. ninguno; ads "se engancha" pero no requiere
  nav?: NavLink[]                        // reemplaza NAV_MODULE y SITE_CONFIG.nav
  adminSections?: AdminSection[]         // reemplaza los `module:` de AdminShell
  homeBlocks?: string[]                  // ids de bloques que la portada puede pedir
  owns: string[]                         // carpetas propias, para vercel-ignore (se puede deducir)
}
// src/modules/catalog/server.ts
export const sitemap = async (s: SiteSettings) => [...]
export const homeBlocks = { hero: HeroSection, latest: PremiumListings, brands: BrandStrip, guideCta: GuideCta }
```

### Árbol de vitri-api

```
cmd/api/main.go                 # conecta BD, carga tenants, monta el núcleo y llama modules.Mount(app)
internal/
├── database/                   # Connect, migración del núcleo, tenants.go (siembra y backfill)
├── middleware/                 # SiteTenant, RequireModule, JWT, permisos (núcleo)
├── models/                     # modelos del núcleo: Tenant, User, Comment, Country… (+ los de módulos al principio)
├── httpx/                      # helpers que hoy están en handlers/: paginación, validación, slug, errores
├── services/                   # blob, revalidate, indexnow (núcleo)
├── handlers/                   # núcleo: auth, tenants, site_settings, users_admin, comments, location
└── modules/
    ├── module.go               # type Module, type Routes
    ├── registry.go             # var All = []Module{news.Module, events.Module, …}; Mount(app)
    ├── routes_snapshot_test.go # golden de app.GetRoutes(): ninguna ruta cambia sin querer
    ├── events/   module.go  routes.go  handlers.go  models.go  migrate.go  *_test.go
    ├── news/     … + instagram/, scheduled.go
    ├── classifieds/ … + payments.go, purge.go, fields/vehicle.go
    ├── storefronts/ …
    ├── ads/      … + engine/ (lo que hoy es internal/ads)
    └── catalog/  vehicles.go price_history.go search.go filters.go carousel.go images.go
                  country_filter.go (TenantMiddleware renombrado), embeddings/
```

```go
// internal/modules/module.go
type Module struct {
    ID       string            // models.ModuleCatalog, etc. Es lo que se guarda en tenants.modules.
    Label    string
    Requires []string
    Models   []any             // entra en el AutoMigrate
    Migrate  func(*gorm.DB) error // SQL extra; idempotente; corre siempre, prendido o no
    Routes   func(r Routes)
    Jobs     func(ctx context.Context) // loops de fondo (publicación programada, purga)
}

// Routes antepone el middleware a CADA ruta, nunca con Group(""): en Fiber
// un Group con handlers instala el middleware en todo el prefijo. Es la trampa
// que ya documenta main.go en /api/ops.
type Routes struct {
    Public RouteSet // /api/...,        con mod(ID)
    Ops    RouteSet // /api/ops/...,    con StaffJWT + mod(ID); el permiso lo pone cada ruta
    Admin  RouteSet // /api/admin/...,  API key, SIN mod (rutinas de máquina)
    Legacy RouteSet // grupo con TenantMiddleware (X-Country/X-Vehicle-Type), solo catalog y news
}
```

Sobre los modelos: al principio se quedan en `internal/models` y se mueven de a uno, cuando no generen ciclos de import. Por ejemplo, `Classified` referencia a `User`, que es del núcleo, y eso está bien. Lo que el módulo se lleva desde el día uno son sus handlers, sus rutas, sus migraciones extra y sus jobs.

---

## 3. Una sola llave por módulo

### Cómo está hoy

| Llave | Dónde | Quién la lee | Se puede desincronizar |
|---|---|---|---|
| `tenants.modules` (BD) | API | `RequireModule` en la API; el front por `/api/meta/tenant` | — (es la verdad) |
| `SITE_CONFIG.features` | `src/lib/tenant.ts` | `FALLBACK_SETTINGS` (cuando la API no contesta) y **directo** en `generateStaticParams` de `vehiculo/[slug]` y `marcas/[slug]` | Sí. Si se prende `catalog` en Cardinal Sur, el build no pre-genera fichas y el fallback dice que no hay catálogo. |
| `SITE_CONFIG.nav` + `NAV_MODULE` | `src/lib/tenant.ts`, `site-settings.ts` | menú | Sí: un módulo nuevo no aparece en el menú sin tocar código por marca. |
| Listas de `vercel-ignore.sh` | `scripts/` | Vercel | Sí: un módulo prendido después no dispara builds. |
| Catálogo de módulos: `MODULES` (TS) y `AllModules` (Go) | ambos repos | `/admin/sitio` | Sí, aunque es menos grave: el front ya descarta los ids que no conoce. |

### Propuesta

1. **El estado vive solo en `tenants.modules`.** Se borran `SiteFeatures` y `SITE_CONFIG.features`, y los dos `generateStaticParams` pasan a usar `getSiteSettings()`.
2. **El respaldo es una foto de la API, no un segundo dato.** Un `prebuild` (`scripts/site-snapshot.ts`) baja `GET /api/meta/tenant` con el `X-Tenant` del proyecto y lo escribe en `.vitri/site.json`, que no va al repo. `FALLBACK_SETTINGS` pasa a ser ese archivo.
   - Si la API no contesta en el build, **el build falla** y Vercel sigue sirviendo el deploy anterior.
   - En una revalidación ISR con la API caída se usa la foto, que es lo último que dijo la API. Nunca se usa algo escrito a mano.
3. **El menú sale de los módulos.** Cada `FrontModule` aporta sus `nav`. El orden y las etiquetas propias del sitio ("Novedades" o "Blog") salen de la configuración del tenant en la fase 4 (`nav: [{module: "news", label: "Novedades"}, …]`), con la etiqueta del módulo como valor por defecto.
4. **Catálogo de módulos con contrato.** La API expone `GET /api/meta/modules` (id, etiqueta, descripción, `requires`), que es público, no tiene secretos y es aditivo. `npm run modules:check` falla si el registro del front tiene un id que la API no conoce o al revés, igual que `ads:check` con los espacios. `/admin/sitio` muestra la lista de la API.
5. **`requires` se valida en la API.** `UpdateSiteSettings` rechaza prender `ads` sin las páginas que lo alojan, si se decide que eso importa (ver decisiones).
6. **Los rubros también vienen de la API.** `FALLBACK_SETTINGS.categories` (la copia de `DefaultListingCategories`) sale de la misma foto.

Con esto no queda ninguna llave en el código del front: un sitio sabe qué es leyendo `X-Tenant → /api/meta/tenant`.

---

## 4. Flujo para un portal nuevo con funciones propias

Ejemplo: un portal de inmuebles con un tasador propio.

**Paso 0: ¿hace falta un módulo?** Antes de crear uno, revisar en este orden:

1. ¿Alcanza con rubros y campos por rubro (fase 3)? Por ejemplo, "dormitorios" o "m²" son campos de rubro, no un módulo.
2. ¿Alcanza con un módulo existente más configuración?
3. Recién si no alcanza: un módulo nuevo, `appraiser`. Aunque hoy lo use un solo sitio, se escribe sin nombre de marca.

**API (vitri-api)**

1. Crear `internal/modules/appraiser/` con `module.go` (`ID`, `Label`, `Requires`), `routes.go`, sus handlers, sus modelos y `migrate.go`.
2. Agregar la constante `models.ModuleAppraiser`, sumarla a `AllModules` y registrar el módulo en `internal/modules/registry.go`.
3. Rutas bajo su propio prefijo (`/api/appraiser/...` y `/api/ops/appraiser/...`), registradas a través de `Routes`, que agrega `mod(ID)` solo.
4. **Migraciones.** Solo aditivas (tablas nuevas, columnas nulas). Corren en el arranque para toda la BD: la tabla existe para todos los sitios y está vacía donde el módulo está apagado. Lo destructivo va en un PR aparte, con un paso manual documentado.
5. **Tests.** Los del handler, más el golden de rutas actualizado. Ese diff tiene que mostrar *solo* las rutas nuevas, y es la prueba de que no se tocó ninguna ruta de las rutinas de TodoMotor.
6. **Deploy.** Merge a `main` (con OK del usuario) y Railway despliega. El módulo existe y está apagado en todos los sitios.

**Front (vitri-web)**

7. Crear `src/modules/appraiser/` con `index.ts` (manifiesto), `server.ts`, `components/` y `lib/`, y sumarlo a `src/modules/registry.ts`.
8. Crear las páginas en `src/app/(appraiser)/tasar/…`, con un `layout.tsx` que haga `requireModule('appraiser')`.
9. Si cambia el look, crear el tema `src/themes/<tema>/` y registrarlo.
10. **Tests.** `npm run lint`, `npm run modules:check` y `next build` con `NEXT_PUBLIC_TENANT=<id>` y con `todomotor-uy`.
11. **Deploy.** Merge a `master` (con OK). Los proyectos que no tienen el módulo prendido se saltean el build solos (ver abajo).

**Prenderlo**

12. Alta del tenant (`PUT /api/admin/tenants/<id>`, como hoy en `docs/nuevo-portal.md`), y después `/admin/sitio` → Módulos → *Tasador*.
13. Proyecto de Vercel nuevo con Ignored Build Step `bash scripts/vercel-ignore.sh`, sin argumento: el script toma el sitio de `NEXT_PUBLIC_TENANT`.

### Reemplazo de la lista fija de `vercel-ignore.sh`

La regla nueva sale de las carpetas:

- Un archivo en `src/modules/<m>/` o en `src/app/(<m>)/` es del módulo `<m>`.
- Todo lo demás (núcleo, `themes/`, `package.json`, etc.) afecta a todos los sitios.
- Las excepciones por tema: `src/themes/<t>/` y `public/brand/<t>-*` son del tema `<t>`.

El script:

1. lee el sitio de `NEXT_PUBLIC_TENANT` (y mantiene el argumento viejo, para no romper los dos proyectos actuales mientras tanto);
2. baja `GET /api/meta/tenant` con ese `X-Tenant`, que es público y no necesita secretos, para saber los módulos y el tema;
3. hace el build si algún archivo cambiado es del núcleo, de un módulo prendido o de su tema;
4. si no puede consultar la API o el diff, hace el build. Se mantiene el *fail-safe* de hoy y el caso del redeploy del mismo commit.

Queda un caso a resolver: si se **prende** un módulo que el sitio venía salteando, su deploy tiene código viejo de ese módulo. Hay dos opciones (decisión 4):

- **Redeploy manual** documentado en `/admin/sitio`: "después de prender un módulo, hacé Redeploy".
- **Deploy hook** de Vercel por sitio: la API lo llama al guardar módulos. Es más cómodo, pero suma un secreto por sitio en Railway.

**Pruebas del script.** Un `scripts/vercel-ignore.test.sh` que arma un repo temporal con commits de ejemplo y verifica la salida para cada caso: solo docs, solo `catalog` con el sitio sin catálogo, núcleo, redeploy y API caída.

---

## 5. Plan de migración en PRs chicos

Principios:

- Cada PR deja los dos sitios funcionando igual que antes.
- Los PRs de movimiento son solo `git mv` y cambios de imports, sin lógica, para que la revisión sea mecánica.
- Ninguna ruta de la API cambia: el primer PR de la API es justamente el que lo verifica.
- Ningún merge a producción sin el OK del usuario.

Tamaños: **XS** < 50 líneas, **S** < 200, **M** < 600, **L** más (casi todo movido, no reescrito).

### API (vitri-api), en orden

| # | PR | Tamaño | Notas |
|---|---|---|---|
| A1 | Golden de rutas: test que compara `app.GetRoutes()` (método, path, cantidad de handlers) contra `testdata/routes.golden`. Requiere sacar el armado de rutas de `main()` a una función `buildApp()`. | S | La red de seguridad de todo lo que sigue. Cubre las rutas de las rutinas (`/api/admin/vehicles*`, `/api/admin/blog*`, `/api/admin/ads/rollup`, `/api/admin/classifieds/purge`, `/api/admin/instagram/*`). |
| A2 | `internal/httpx`: mover a un paquete los helpers de `handlers/` que van a usar los módulos (paginación, validación, slug, `isUniqueViolation`). | M | Solo movimiento. |
| A3 | `internal/modules` (tipos, registro, `Mount`) y el **piloto `events`**: handlers, rutas y test. | S–M | El módulo más chico (1 handler, 2 modelos). Valida el diseño de `Routes` sin `Group("")`. |
| A4 | `storefronts` | M | |
| A5 | `news` (blog, tags, Instagram, publicación programada) | M–L | Rutas en tres grupos (`/admin`, `/ops` y el *legacy*). El golden es clave. |
| A6 | `classifieds` (más pagos y purga; `classified_vehicle_fields` queda en `fields/vehicle.go`) | L | Prepara la fase 3. |
| A7 | `ads` (`internal/ads` pasa a `modules/ads/engine`) | M | |
| A8 | `catalog` (vehículos, historial, búsqueda, filtros, carrusel, imágenes, `TenantMiddleware`) | L | El último y el más delicado: el grupo con `TenantMiddleware` se tiene que registrar después de todo lo demás, como hoy. Verificar después del deploy con las rutinas reales contra `api.todomotor.uy`. |
| A9 | `GET /api/meta/modules` y la validación de `requires` en `UpdateSiteSettings` | S | Aditivo. |
| A10 | Fase 4: identidad del sitio en el tenant (`theme`, `shortName`, `title`, `description`, `keywords`, `contactEmail`, `logo`, `nav`, `copy` en jsonb) más la edición en `/admin/sitio` | M | Aditivo, con valores iniciales iguales a los de `tenant.ts` hoy. |

### Front (vitri-web), en orden

| # | PR | Tamaño | Notas |
|---|---|---|---|
| W1 | Arreglos sin cambio visible: `ClassifiedFilters` usa `categoryHasVehicleFields`; `generateStaticParams` usa `getSiteSettings()`; el email del JSON-LD de la portada sale de `SITE_CONFIG`. | XS | Se puede hacer ya. |
| W2 | Grupos de rutas: mover las secciones a `src/app/(catalog)/`, `(news)/`, etc., con un `layout.tsx` por grupo. Actualizar las regex de `vercel-ignore.sh` a las rutas nuevas. | S | Las URLs no cambian. Verificar que la lista de rutas de `next build` sea idéntica antes y después en los dos sitios. |
| W3 | `src/modules/` (tipos, registro) y mover `ads` como piloto. | M | Es el módulo más autocontenido del front. |
| W4a | `catalog`: mover lib, datos y tipos (`api.ts`, `catalog.ts`, `data.ts`, `vehicle-*`, `buying-guide/`, `data/`). | L | Solo movimiento (~3.200 líneas entre rutas, guía y componentes de la guía). |
| W4b | `catalog`: mover componentes (vehículos, comparador, guardados, historial). | L | Ojo: `SavedProvider` se usa en 6 lugares, incluido el layout raíz: queda como un *provider* que aporta el módulo. |
| W5 | `news`, `events`, `classifieds` y `storefronts` a `src/modules/`. | M c/u | Pueden ir en paralelo, porque no se tocan entre sí. |
| W6 | Manifiestos: el menú, las secciones de admin y el sitemap salen del registro. Se borran `NAV_MODULE`, los `module:` de `AdminShell` y el `nautiSitemap()` aparte. | M | |
| W7 | Una sola llave: `scripts/site-snapshot.ts` en `prebuild` y fuera `SITE_CONFIG.features`. | S–M | Requiere que TodoMotor mande `X-Tenant`. El CORS de la API ya lo permite (`AllowHeaders` incluye `X-Tenant`), así que el comentario de `tenant.ts` sobre CORS quedó viejo. Igual hay que probarlo en un preview. |
| W8 | `vercel-ignore.sh` deducido de las carpetas y de la API, más su test. | M | Después de W2–W5, cuando las carpetas ya dicen de quién son. |
| W9 | Temas: `src/themes/{default,cardinalsur}/`. `NautiHeader`, `NautiFooter` y `NautiHome` pasan a ser variantes genéricas (header sin buscador, portada de contenidos). `IS_NAUTI` sale de `layout`, `og`, `manifest`, `not-found` y `robots` (pasa a `NEXT_PUBLIC_INDEXABLE` en todos los sitios). | M | Requiere A10, o un mapa provisorio `tenant → tema` en el código. |
| W10 | Fase 4: textos desde la API (`copy`). `IS_NAUTI` sale de los archivos restantes y se borra junto con `brand`. | L, en 2 o 3 PRs | Requiere A10. Al final, `tenant.ts` queda en `TENANT_ID` y `tenantHeader()`. |
| W11 | `modules:check`, más un workflow de GitHub con `lint` y `next build` para los dos tenants. | S | Hoy el front no tiene CI propio: solo los previews de Vercel. |

**Orden sugerido entre repos:** W1 → A1 → W2 → A2–A3 → W3 → (A4–A8 y W4–W6 en paralelo, cada uno en su repo) → A9 → W7 → W8 → A10 → W9 → W10 → W11. La fase 3 (campos por rubro) puede arrancar después de A6 y W5.

---

## Decisiones para el usuario

1. **Por módulo** (recomendado) **o por portal.** El resto del documento supone que es por módulo.
2. **Dónde viven los textos de cada sitio** (los 21 archivos que usan `IS_NAUTI`, sin contar `tenant.ts`):
   - (a) todos en la BD, editables desde `/admin/sitio`; o
   - (b) paquetes por vertical en código (`automotive`, `nautical`), que la BD puede pisar.

   (b) es menos trabajo y cubre un tercer sitio de una vertical existente. (a) es la fase 4 "pura".
3. **Nombre de los temas:** por marca (`themes/cardinalsur`) o por estilo (`themes/marino`). Además: ¿se renombran ahora las carpetas `nauti` a `cardinalsur`? El id `nauti-uy` no cambia.
4. **Al prender un módulo:** redeploy manual documentado o *deploy hook* que llama la API (un secreto más por sitio en Railway).
5. **Guía de compra, comparador e historial de precios:** ¿siguen como partes de `catalog` o pasan a ser módulos propios que se prenden por separado? Hoy no hay ningún sitio que los quiera por separado, así que recomiendo dejarlos dentro de `catalog` por ahora.
6. **Build atado a la API:** aceptar que el build de un sitio falle si la API no contesta, a cambio de no tener respaldo escrito a mano (W7).
7. **Dependencias entre módulos:** ¿`UpdateSiteSettings` rechaza combinaciones sin sentido (por ejemplo `ads` sin `catalog` ni `news`) o solo avisa?
