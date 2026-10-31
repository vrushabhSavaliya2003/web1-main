import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Manrope — closest free match to the reference's licensed "Mier" typeface.
// Mier is a geometric humanist sans; Manrope shares its narrow proportions and
// flat terminals, where Mulish (used previously) rendered wider and heavier at
// the same size/weight, making 18px "book" text look bold.
const appFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-app-face",
  display: "swap",
});
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${brand.tagline} - ${brand.name}`,
  description: `${brand.name} — on groceries, fashion, electronics and more.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: brand.colors.primary,
};

// Phone-only gate, client-side. Runs before first paint so desktop/tablet
// visitors see the loader immediately — same UX as the old middleware
// rewrite, but it costs Vercel zero edge invocations (middleware now only
// guards /admin). Crawlers and bots are exempt, so SEO/link previews still
// see the real storefront. Mirrors lib/ua.ts isPhone/isCrawler exactly.
const deviceGate = `
(function () {
  var path = location.pathname;
  if (path === "/mobile-only" || path.indexOf("/admin") === 0) return;
  var ua = navigator.userAgent || "";
  if (/bot|crawl|spider|slurp|preview|headless|phantom|lighthouse|pingdom|uptime|bytespider|gptbot|semrush|ahrefs|facebookexternalhit|metaexternalagent|whatsapp|telegram|pinterest|linkedin|discord|viber/i.test(ua)) return;
  var s = ua.toLowerCase();
  if (/ipad|macintosh|tablet/i.test(s)) { location.replace("/mobile-only"); return; }
  if (!/iphone|ipod|android[\\s\\S]*?mobile|windows phone|iemobile|blackberry|opera mini|webos/i.test(s)) {
    location.replace("/mobile-only");
  }
})();
`;

// Root layout is intentionally bare: the storefront chrome lives in
// app/(shop)/layout.tsx and the admin panel has its own shell, so /admin
// does not inherit the header, bottom nav or cart drawer.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={appFont.variable}>
      <body>
        {/* First element in <body>: runs synchronously before any paint. */}
        <script dangerouslySetInnerHTML={{ __html: deviceGate }} />
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1425866279530781');
fbq('track', 'PageView');`,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1425866279530781&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
