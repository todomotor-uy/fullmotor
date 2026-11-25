# Vitri Web

El front de los portales que corren sobre [Vitri API](https://github.com/todomotor-uy/vitri-api): Novedades, clasificados y comercios, eventos y, donde corresponde, el catálogo de vehículos. Hoy sirve **TodoMotor** (todomotor.uy) y **Nauti**.

Es una sola app de Next.js. Cada sitio es un proyecto de Vercel con el mismo repo y su propio `NEXT_PUBLIC_TENANT`:

| Sitio | Proyecto de Vercel | `NEXT_PUBLIC_TENANT` |
|---|---|---|
| TodoMotor | `fullmotor` | `todomotor-uy` (o vacío) |
| Nauti | `nauti` | `nauti-uy` |

La configuración de cada sitio (nombre, textos de SEO, menú, funciones activas, logo) está en [`src/lib/tenant.ts`](src/lib/tenant.ts). Lo que es del backend (moneda, dominio, hashtag, rubros) vive en la fila del sitio en la API.

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completar NEXT_PUBLIC_API_URL y el resto
npm run dev
```

Para levantar Nauti en local, agregar `NEXT_PUBLIC_TENANT=nauti-uy` a `.env.local`.

## Variables de entorno

Ver [`.env.example`](.env.example). Las principales:

- `NEXT_PUBLIC_API_URL`: la API (producción: `https://api.todomotor.uy`).
- `NEXT_PUBLIC_TENANT`: qué sitio es este deploy.
- `NEXT_PUBLIC_SITE_URL`: el dominio canónico del sitio.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: el cliente de Google Sign-In del sitio.
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob, donde se guardan las imágenes.
- Secretos de servidor: `API_SECRET_KEY`, `UPLOAD_API_KEY`, `REVALIDATE_SECRET`, `INDEXNOW_TRIGGER_SECRET`, `INDEXNOW_KEY`.

## Deploy

Vercel deploya cada proyecto solo cuando se mergea a `master`.

## Tecnologías

Next.js 16, React 19, TypeScript, Tailwind CSS 4, TipTap (editor de Novedades y páginas de comercios), Leaflet (mapas).
