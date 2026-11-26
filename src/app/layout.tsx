import type { Metadata } from "next";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { IS_NAUTI, SITE_CONFIG } from "@/lib/tenant";
import { spaceGrotesk, hankenGrotesk, jetbrainsMono } from "./fonts";
import AuthProvider from "./components/AuthProvider";
import SavedProvider from "./components/SavedProvider";
import SiteHeader from "./components/SiteHeader";
import SiteFooter from "./components/SiteFooter";
import SiteAnalytics from "./components/SiteAnalytics";
import SiteSettingsProvider from "./components/SiteSettingsProvider";
import { getSiteSettings } from "@/lib/site-settings.server";

const OG_DESCRIPTION = IS_NAUTI
  ? "Clasificados y noticias de la náutica uruguaya"
  : "Fichas técnicas de vehículos en Uruguay";

export const metadata: Metadata = {
  // Nauti's mark; TodoMotor keeps the file-based app/icon.svg.
  ...(IS_NAUTI ? { icons: { icon: "/brand/nauti-mark.svg" } } : {}),
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_CONFIG.title,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  keywords: SITE_CONFIG.keywords,
  openGraph: {
    title: SITE_CONFIG.name,
    description: OG_DESCRIPTION,
    type: "website",
    siteName: SITE_NAME,
    locale: "es_UY",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_CONFIG.name,
    description: OG_DESCRIPTION,
  },
  robots: {
    // A tenant on a preview domain stays out of the index until launch.
    index: !IS_NAUTI || process.env.NEXT_PUBLIC_INDEXABLE === '1',
    follow: true,
    'max-image-preview': 'large' as const,
  },
  alternates: {
    canonical: "/",
    types: {
      'application/rss+xml': [
        { url: '/blog/rss.xml', title: SITE_CONFIG.rssTitle },
      ],
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  return (
    <html lang="es" data-tenant={IS_NAUTI ? "nauti" : undefined} className={`${spaceGrotesk.variable} ${hankenGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <SiteSettingsProvider settings={settings}>
          <AuthProvider>
            <SavedProvider>
              <SiteHeader />
              <main className="min-h-screen">
                {children}
              </main>
              <SiteFooter />
            </SavedProvider>
          </AuthProvider>
        </SiteSettingsProvider>
        {/* Outside the providers on purpose: none of these read app context,
            and keeping them out means a provider re-render cannot remount a
            measurement tag and double-count a pageview. */}
        <SiteAnalytics />
      </body>
    </html>
  );
}
