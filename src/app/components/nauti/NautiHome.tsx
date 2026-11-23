import Link from 'next/link'
import Image from 'next/image'
import {
  Anchor, ArrowRight, Caravan, Cog, LifeBuoy, Newspaper, Package, Plus,
  Sailboat, Ship, ShipWheel, Waves, Wrench, type LucideIcon,
} from 'lucide-react'
import { fetchClassifieds } from '@/lib/classifieds-api'
import { fetchBlogTagCounts, getLatestBlogPosts } from '@/lib/blog'
import { fetchEvents } from '@/lib/events'
import type { SiteEvent } from '@/types/event'
import EventListItem from '../EventListItem'
import { blogTagsHref, type TagCount } from '@/lib/blog-tags'
import { formatDate } from '@/lib/format'
import { SITE_CONFIG } from '@/lib/tenant'
import { SITE_LOGO, SITE_NAME, SITE_URL } from '@/lib/site'
import { NAUTICAL_CATEGORIES, type Classified, type ClassifiedCategory } from '@/types/classified'
import type { BlogPost } from '@/types/blog'
import ClassifiedCard from '../ClassifiedCard'
import JsonLd from '../JsonLd'

const CATEGORY_ICONS: Partial<Record<ClassifiedCategory, LucideIcon>> = {
  motorboats: Ship,
  sailboats: Sailboat,
  jetskis: Waves,
  small_craft: LifeBuoy,
  engines: Cog,
  trailers: Caravan,
  equipment: Package,
  moorings: Anchor,
  services: Wrench,
  other: ShipWheel,
}

/**
 * Nauti's home. Novedades (the blog) right under the hero: it is what changes
 * between visits and the reason to come back, then categories and listings.
 * Every section renders a useful empty state, because a new site starts with
 * nothing in it and an empty grid reads as broken.
 *
 * A failed fetch degrades to the empty state rather than failing the page:
 * the hero and categories are worth serving on their own.
 */
export default async function NautiHome() {
  const [classifieds, posts, tagCounts, upcoming] = await Promise.all([
    fetchClassifieds({ limit: 8 })
      .then((r) => r.data)
      .catch((): Classified[] => []),
    getLatestBlogPosts(6).catch((): BlogPost[] => []),
    fetchBlogTagCounts().catch((): TagCount[] => []),
    fetchEvents({ limit: 3 }).catch((): SiteEvent[] => []),
  ])

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: SITE_LOGO },
    contactPoint: { '@type': 'ContactPoint', email: SITE_CONFIG.contactEmail, contactType: 'customer service' },
  }

  return (
    <div style={{ paddingBottom: 56 }}>
      <JsonLd data={organizationJsonLd} />

      <section className="nh-hero">
        <div className="nh-hero__in">
          <span className="nh-hero__eyebrow">El portal náutico uruguayo</span>
          <h1>La náutica uruguaya, al día.</h1>
          <p>
            Novedades, regatas, eventos y guías de la temporada. Y para comprar o vender, clasificados
            gratis.
          </p>
          <div className="nh-hero__ctas">
            <Link href="/blog" className="tm-btn">
              <Newspaper size={16} aria-hidden="true" /> Leer novedades
            </Link>
            <Link href="/eventos" className="tm-btn tm-btn--secondary">
              Calendario de eventos
            </Link>
            <Link href="/clasificados" className="nh-hero__link">
              Clasificados <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <svg className="nh-hero__waves" viewBox="0 0 1440 72" preserveAspectRatio="none" aria-hidden="true">
          <path
            fill="currentColor"
            d="M0 40 C 180 10 360 10 540 34 S 900 66 1080 40 S 1320 14 1440 30 L1440 72 L0 72 Z"
          />
        </svg>
      </section>

      <section className="h-sect">
        <div className="h-sect__head">
          <div>
            <h2>Novedades</h2>
            <p>Lo último de la náutica uruguaya: regatas, temporada, puertos y guías</p>
          </div>
          <Link href="/blog" className="h-link">
            Ver todas <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {/* The most used tags, one click into a filtered Novedades. */}
        {tagCounts.length > 0 && (
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 20 }}>
            {tagCounts.slice(0, 12).map(({ tag }) => (
              <Link key={tag} href={blogTagsHref([tag])} className="tm-chip">
                {tag}
              </Link>
            ))}
          </div>
        )}
        {posts.length > 0 ? (
          <div className="h-posts">
            {posts.map((post) => (
              <Link href={`/blog/${post.slug}`} key={post.id} className="h-post">
                <div className="h-post__top">
                  {post.coverImage
                    ? <Image src={post.coverImage} alt="" fill sizes="(max-width: 1000px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
                    : <Newspaper size={30} aria-hidden="true" />}
                </div>
                <div className="h-post__b">
                  <span className="h-post__tag">{post.tags?.[0] || 'Blog'}</span>
                  <h3 className="h-post__t">{post.title}</h3>
                  <span className="h-post__d">{formatDate(post.publishedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="nh-empty">
            <strong>Pronto, las primeras notas</strong>
            Estamos preparando contenido sobre la náutica uruguaya.
          </div>
        )}
      </section>

      <section className="h-sect">
        <div className="h-sect__head">
          <div>
            <h2>Próximos eventos</h2>
            <p>Regatas, salidas y encuentros que se vienen</p>
          </div>
          <Link href="/eventos" className="h-link">
            Ver calendario <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {upcoming.length > 0 ? (
          <div className="ev-list">
            {upcoming.map((e) => (
              <EventListItem key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <div className="nh-empty">
            <strong>Todavía no hay eventos en el calendario</strong>
            Pronto vas a encontrar acá las regatas y encuentros de la temporada.
          </div>
        )}
      </section>

      <section className="h-sect">
        <div className="h-sect__head">
          <div>
            <h2>Explorá por categoría</h2>
            <p>De un kayak a un crucero, y todo lo que hace falta para salir al agua</p>
          </div>
        </div>
        <div className="nh-cats">
          {NAUTICAL_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICONS[c.id] ?? ShipWheel
            return (
              <Link key={c.id} href={`/clasificados?category=${c.id}`} className="nh-cat">
                <Icon size={26} aria-hidden="true" />
                <span>{c.label}</span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="h-sect">
        <div className="h-sect__head">
          <div>
            <h2>Recién publicados</h2>
            <p>Los últimos avisos de particulares y comercios</p>
          </div>
          <Link href="/clasificados" className="h-link">
            Ver todos <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {classifieds.length > 0 ? (
          <div className="nh-grid">
            {classifieds.map((c) => (
              <ClassifiedCard key={c.id} classified={c} />
            ))}
          </div>
        ) : (
          <div className="nh-empty">
            <strong>Todavía no hay avisos publicados</strong>
            Sé el primero: publicar tu embarcación es gratis.
            <div style={{ marginTop: 16 }}>
              <Link href="/clasificados/nuevo" className="tm-btn">
                <Plus size={16} aria-hidden="true" /> Publicar un aviso
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="h-sect">
        <div className="nh-band">
          <div>
            <h2>¿Tenés un comercio náutico, broker o guardería?</h2>
            <p>
              Abrí tu vidriera en Nauti: todos tus avisos con tu marca, en un solo lugar y con fotos extra.
            </p>
          </div>
          <div className="nh-band__actions">
            <Link href="/comercios/solicitar" className="tm-btn tm-btn--lg">
              Abrir mi vidriera
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
