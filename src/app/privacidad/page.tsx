import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_CONFIG } from '@/lib/tenant'

const SITE_HOST = new URL(SITE_CONFIG.defaultUrl).host

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description:
    `Cómo ${SITE_CONFIG.name} trata tus datos personales: qué medimos, qué cookies usamos y cómo ejercer tus derechos bajo la Ley 18.331.`,
  alternates: { canonical: '/privacidad' },
}

// Static: nothing here depends on the API or on the visitor.
export const dynamic = 'force-static'

export default function PrivacidadPage() {
  return (
    <div className="art">
      <h1 className="art__title">Política de privacidad</h1>
      <div className="blog-content" style={{ marginTop: 'var(--space-7)' }}>
        <p>
          Esta política explica qué datos recogemos en <strong>{SITE_HOST}</strong>, para qué los usamos y
          cómo podés controlarlos. Está redactada según la Ley 18.331 de Protección de Datos Personales y su
          decreto reglamentario 64/020.
        </p>

        <h2>Quién es responsable</h2>
        <p>
          {SITE_CONFIG.name}, Montevideo, Uruguay. Consultas sobre datos personales:{' '}
          <a href={`mailto:${SITE_CONFIG.contactEmail}`}>{SITE_CONFIG.contactEmail}</a>.
        </p>

        <h2>Qué datos recogemos</h2>
        <p>
          <strong>Si solo navegás el sitio</strong>, no te pedimos ningún dato personal. Medimos visitas de
          forma agregada: qué páginas se ven, desde qué tipo de dispositivo y desde qué país. No sabemos quién
          sos.
        </p>
        <p>
          <strong>Si iniciás sesión con Google</strong> (para guardar vehículos, publicar un clasificado o
          administrar un comercio), recibimos de Google tu nombre, tu correo electrónico y tu foto de
          perfil. Los usamos para identificar tu cuenta y para mostrar tus avisos. Nada más.
        </p>
        <p>
          <strong>Si publicás un clasificado</strong>, los datos de contacto que cargues son visibles para
          quien vea el aviso, salvo que elijas ocultarlos.
        </p>

        <h2>Cookies y medición</h2>
        <p>Usamos tres herramientas, y no todas necesitan tu consentimiento:</p>
        <table>
          <thead>
            <tr>
              <th>Herramienta</th>
              <th>Para qué</th>
              <th>¿Usa cookies?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Vercel Analytics</td>
              <td>Contar visitas y páginas vistas</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Vercel Speed Insights</td>
              <td>Medir la velocidad de carga real</td>
              <td>No</td>
            </tr>
            <tr>
              <td>Google Analytics 4</td>
              <td>Entender el comportamiento agregado del sitio</td>
              <td>Sí — requiere tu consentimiento</td>
            </tr>
          </tbody>
        </table>
        <p>
          También usamos una cookie propia llamada <code>tm_consent</code> para recordar tu decisión sobre
          Google Analytics durante seis meses, y una cookie de sesión si iniciaste sesión. Ninguna de las dos
          sirve para publicidad.
        </p>
        <p>
          Si rechazás las cookies de análisis, el sitio funciona igual: seguimos contando la visita de forma
          anónima con Vercel Analytics, que no te identifica.
        </p>

        <h2>Publicidad</h2>
        <p>
          Los espacios publicitarios de {SITE_CONFIG.shortName} son <strong>contextuales</strong>: el aviso que ves depende
          de la sección en la que estás, de la marca de la página o de las respuestas que diste en la guía de
          compra en ese momento. <strong>No armamos un perfil tuyo, no te seguimos entre sitios y no vendemos
          tus datos a nadie.</strong>
        </p>
        <p>
          Si en algún momento una campaña usa etiquetas de un anunciante externo, esas etiquetas solo se
          cargan si aceptaste las cookies, y lo aclaramos en la{' '}
          <Link href="/politica-publicitaria">política publicitaria</Link>.
        </p>

        <h2>Con quién compartimos datos</h2>
        <p>
          Con nuestros proveedores de infraestructura, y únicamente para que el sitio funcione: Vercel
          (hosting y medición), Google (inicio de sesión y analítica) y Railway (base de datos). No vendemos ni
          cedemos datos personales a terceros con fines comerciales.
        </p>

        <h2>Cuánto tiempo los guardamos</h2>
        <p>
          Los datos de tu cuenta, mientras la cuenta exista. Los clasificados vencen a los 30 días y se
          archivan. Las métricas agregadas de tráfico no permiten identificarte y se conservan de forma
          indefinida.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Podés pedirnos acceder a tus datos, rectificarlos, actualizarlos o eliminarlos, y podés revocar tu
          consentimiento en cualquier momento. Escribinos a{' '}
          <a href={`mailto:${SITE_CONFIG.contactEmail}`}>{SITE_CONFIG.contactEmail}</a> y te respondemos dentro de los
          plazos que fija la ley. También podés presentar un reclamo ante la Unidad Reguladora y de Control de
          Datos Personales (URCDP).
        </p>
        <p>
          Para cambiar tu decisión sobre las cookies de análisis, borrá la cookie <code>tm_consent</code> desde
          la configuración de tu navegador y volvé a entrar: el aviso aparece de nuevo.
        </p>
      </div>
    </div>
  )
}
