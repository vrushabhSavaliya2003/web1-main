import { Suspense } from "react";
import { notFound } from "next/navigation";
import { formatPrice, specialOffer, seededRandom } from "@/lib/data";
import { getProductByHash, getAllProducts } from "@/lib/catalog";
import { buildRatings } from "@/lib/reviews";
import ProductPurchase from "@/components/ProductPurchase";
import ProductImageSlider from "@/components/ProductImageSlider";
import ProductHighlights from "@/components/ProductHighlights";
import AdditionalInfo from "@/components/AdditionalInfo";
import TrustedLogo from "@/components/TrustedLogo";
import ReviewsSection from "./ReviewsSection";
import ForYouSection from "./ForYouSection";


// ISR: rendered once, served from the CDN for 1 hour. Admin edits (price,
// images, position) are visible instantly via /api/revalidate while shoppers
// never wait on the database. The shell below only depends on the single
// product query; reviews and "Products For You" stream in afterwards, so the
// hero, price and buy bar appear as fast as possible.
export const revalidate = 3600;

// Every product page is pre-rendered at build time, so bots crawling the
// catalogue hit static CDN files instead of server functions. Falls back to
// on-demand ISR for products added after the last build.
export async function generateStaticParams() {
  try {
    const products = await getAllProducts();
    return products.map((p) => ({ hash: p.hash }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { hash: string } }) {
  const p = await getProductByHash(params.hash);
  return { title: p ? p.name : "Product" };
}

export default async function ProductPage({ params }: { params: { hash: string } }) {
  const product = await getProductByHash(params.hash);
  if (!product) notFound();

  const images = (product.images?.length ? product.images : [product.image]).filter(Boolean);
  const ratings = buildRatings(product.hash, product.image);
  const offer = specialOffer(product.hash, product.price);

  // Small independent rating pair for the top row (separate from reviews block).
  const tr = seededRandom("top:" + product.hash);
  // const topRatings = 100 + Math.floor(tr() * 900);
  // const topRatings = Ratingsummur.RatingCount ;
  // const topReviews = 10 + Math.floor(tr() * 50);
  const topReviews = 10 + Math.floor(tr() * 50);
  const topStar = Math.floor(Number(ratings.average));

  // Admin-entered sections — hidden until the product has data for them.
  const highlightRows: [string, string][] = (
    [
      ["Fabric", product.fabric ?? ""],
      ["Color", product.color ?? ""],
      ["Pattern", product.pattern ?? ""],
      ["Fit/Shape", product.fit_shape ?? ""],
    ] as [string, string][]
  ).filter(([, v]) => Boolean(v.trim()));
  const infoRows = (product.additional_info ?? []).filter((r) => Boolean(r.label?.trim()));

  return (
    <div className="pb-16 bg-[#f4f4f6]">
      {/* Image slider (up to 10 images, swipeable + thumbnail strip) */}
      <div className="bg-white px-4 pt-4">
        <ProductImageSlider images={images} name={product.name} />
      </div>

      {/* Title + price block */}
      <div className="bg-white px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          {/* .product-title — 15px demi, #8B8BA3, ~21px line-height */}
          <h1 className="product-title flex-1">{product.name}</h1>
          <div className="flex gap-4 shrink-0 pt-0.5">
            <Action label="Wishlist">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.6">
                <path d="M12 20.8 3.6 12.4a5.1 5.1 0 0 1 7.2-7.2l1.2 1.2 1.2-1.2a5.1 5.1 0 0 1 7.2 7.2z" />
              </svg>
            </Action>
            <Action label="Share">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.6">
                <circle cx="18" cy="5" r="2.5" />
                <circle cx="6" cy="12" r="2.5" />
                <circle cx="18" cy="19" r="2.5" />
                <path d="M8.2 10.8 15.8 6.2M8.2 13.2l7.6 4.6" />
              </svg>
            </Action>
          </div>
        </div>

        <div className="flex items-baseline gap-2 mt-3">
          {/* span.price — 25px bold, #353543 */}
          <span className="text-[25px] font-extrabold text-[#353543] leading-none">
            {formatPrice(product.price)}
          </span>
          {product.mrp > product.price && (
            <span className="text-[13px] text-[#9b9b9b] line-through">{formatPrice(product.mrp)}</span>
          )}
          {product.off && <span className="text-[13px] text-[#8b8ba3] font-semibold">{product.off}</span>}
        </div>

        {/* Special offers pill */}
        {/* offer pill — 12px demi #038D63 on #EAFAF3, trailing filled info dot */}
        <div className="inline-flex items-center gap-1.5 mt-2.5 bg-[#eafaf3] text-[#038d63] text-[12px] font-semibold rounded-full pl-2 pr-1 py-[3px]">
          {formatPrice(offer.amount)} with {offer.count} Special Offer{offer.count > 1 ? "s" : ""}
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
            <circle cx="8" cy="8" r="8" fill="#038d63" />
            <circle cx="8" cy="4.6" r="1" fill="#fff" />
            <rect x="7.2" y="6.6" width="1.6" height="5" rx="0.8" fill="#fff" />
          </svg>
        </div>

        {/* Rating row */}
        <div className="flex items-center gap-2 mt-3">
          <span className="inline-flex items-center gap-1 bg-[#038d63] text-white text-[13px] font-semibold px-2 py-0.5 rounded">
            {/* {topStar} */}
            {ratings.average}
            <Star />
          </span>
          <span className="text-[12px] text-[#8b8ba3]">
            {/* {topRatings} ratings and {topReviews} reviews */}
            {ratings.ratingCount} ratings and {ratings.reviewCount} reviews
          </span>
          <span className="w-1 h-1 rounded-full bg-[#c9c9d1]" />
          {/* Trusted pill — same pink pill as the reference's trusted-badge-mini */}
          <span className="inline-flex items-center rounded-[12px] bg-[#fff0fc] px-2 py-0.5">
            <TrustedLogo />
          </span>
        </div>

        <p className="text-[13px] font-bold mt-3">Free Delivery</p>
      </div>

      {/* Select Size + Sold by + sticky buy bar (client) */}
      <ProductPurchase product={product} />

      {/* Product Highlights — admin-entered at upload time */}
      {highlightRows.length > 0 && <ProductHighlights rows={highlightRows} />}

      {/* Additional Details — admin-entered, collapsed by default */}
      {infoRows.length > 0 && <AdditionalInfo rows={infoRows} />}

      {/* Ratings & Reviews — streamed after the shell */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <ReviewsSection product={product} ratings={ratings} />
      </Suspense>

      {/* Blue trust strip */}
      <div className="mt-2 flex items-center justify-between px-2 py-4" style={{ background: "#eaf1ff" }}>
        <TrustItem label="Lowest Price" icon={<PriceIco />} />
        <span className="w-px h-8 bg-[#cdd8ef]" />
        <TrustItem label="Cash on Delivery" icon={<CodIco />} />
        <span className="w-px h-8 bg-[#cdd8ef]" />
        <TrustItem label="7-day Returns" icon={<ReturnIco />} />
      </div>

      {/* Products For You — streamed after the shell */}
      <Suspense fallback={<ForYouSkeleton />}>
        <ForYouSection category={product.category} excludeHash={product.hash} />
      </Suspense>
    </div>
  );
}

/* ---------------------------- skeletons ------------------------------------ */
function ReviewsSkeleton() {
  return (
    <div className="bg-white mt-2 animate-pulse">
      <div className="px-4 py-4">
        <div className="h-5 w-56 rounded bg-[#eaeaef]" />
      </div>
      <div className="flex gap-4 px-4 py-1">
        <div className="w-[62px]">
          <div className="h-9 w-16 rounded bg-[#eaeaef]" />
          <div className="h-3 w-24 rounded bg-[#eaeaef] mt-3" />
          <div className="h-3 w-20 rounded bg-[#eaeaef] mt-2" />
        </div>
        <div className="flex-1 space-y-2 pt-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-2.5 rounded bg-[#eaeaef]" />
          ))}
        </div>
      </div>
      <div className="px-4 py-3 space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-16 rounded bg-[#eaeaef]" />
        ))}
      </div>
    </div>
  );
}

function ForYouSkeleton() {
  return (
    <div className="mt-2 bg-white pt-4 pb-4 animate-pulse">
      <div className="h-6 w-40 rounded bg-[#eaeaef] mx-4" />
      <div className="grid grid-cols-2 gap-3 px-4 mt-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 rounded bg-[#eaeaef]" />
        ))}
      </div>
    </div>
  );
}

/* ---------------------------- small pieces -------------------------------- */
function Star({ size = 9, fill = "#fff" }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={fill} aria-hidden>
      <path d="M10 .3l2.6 6 6.5.5-4.9 4.2 1.5 6.3L10 14l-5.7 3.3 1.5-6.3L.9 6.8l6.5-.5L10 .3z" />
    </svg>
  );
}
function Action({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 text-[11px] text-[#666]">
      {children}
      <span>{label}</span>
    </div>
  );
}
function TrustItem({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1.5">
      {icon}
      <span className="text-[12px] font-semibold text-[#3f4a63]">{label}</span>
    </div>
  );
}
function PriceIco() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="13" fill="#DDE8FF" />
      <text x="12" y="21" fontSize="13" fontWeight="bold" fill="#038d63">₹</text>
      <path d="M21 12v7m0 0l-2.5-2.5M21 19l2.5-2.5" stroke="#038d63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CodIco() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="13" fill="#DDE8FF" />
      <rect x="8" y="12" width="16" height="9" rx="1.5" fill="#038d63" />
      <circle cx="16" cy="16.5" r="2.4" fill="#fff" />
      <text x="16" y="18.2" fontSize="3.6" fontWeight="bold" textAnchor="middle" fill="#038d63">₹</text>
    </svg>
  );
}
function ReturnIco() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="13" fill="#DDE8FF" />
      <path d="M11 13a6 6 0 1 1-1 3.5" stroke="#F4A93B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M8 9v4h4" stroke="#F4A93B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
