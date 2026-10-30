"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { formatPrice, seededRandom } from "@/lib/data";
import { useCountdown, fmtCountdown } from "@/lib/countdown";
import TimerIcon from "./TimerIcon";
import TrustedLogo from "./TrustedLogo";
import { buildRatings } from "@/lib/reviews";

/**
 * Self-contained countdown pill. Subscribes to the shared countdown context on
 * its own, so only this tiny node re-renders every second — the rest of the
 * card (image, prices, ratings) stays untouched while the timer ticks.
 */
// function CardCountdown() {
//   const t = useCountdown();
//   return (
//     <div className="pc-timer">
//       <TimerIcon size={16} />
//       <span>{fmtCountdown(t)}</span>
//     </div>
//   );
// }

export default function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const router = useRouter();

  // Stable per-product rating + count (seeded so it never changes on re-render).
  const rnd = seededRandom(product.hash);
  // const rating = (rnd() * (5 - 4) + 4).toFixed(1);
  const ratingCount = buildRatings(product.hash, product.image);
  const rating = ratingCount.average;
  const count = ratingCount.ratingCount;
  // console .log("ProductCard: ratingCount:", ratingCount);
  // console .log("ProductCard: rating:", rating, "count:", count);
  // const count = Math.floor(rnd() * 600) + 100;
  // "Hot Sell" only on tiles with a great price difference (high discount %).
  const discountPct = product.mrp > 0 ? ((product.mrp - product.price) / product.mrp) * 100 : 0;
  const showHot = product.badge === "Hot Sell" || discountPct >= 80;

  // Buy Now on the home feed opens the product page (no direct add-to-cart).
  const buyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/product/${product.hash}`);
  };

  return (
    <div className="pc">
      <Link href={`/product/${product.hash}`} className="pc-link">
        <div className="pc-img">
          {showHot && <span className="hot-badge">Hot Sell</span>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "low"}
            decoding="async"
          />
        </div>
        <h3 className="pc-name">{product.name}</h3>
        <div className="pc-price">
          <span className="pc-sell">{formatPrice(product.price)}</span>
          {product.mrp > product.price && (
            <span className="pc-mrp">{formatPrice(product.mrp)}</span>
          )}
          {product.off && <span className="pc-off">{product.off}</span>}
        </div>
      </Link>

      {/* Countdown pill (shared timer) */}
      {/* <CardCountdown /> */}

      {/* Buy Now */}
      <button className="pc-buy" onClick={buyNow}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden>
          <path d="M4 5v14l8-7-8-7z" />
          <path d="M13 5v14l8-7-8-7z" />
        </svg>
        Buy Now
      </button>

      {/* Ratings row */}
      <div className="pc-rating-row">
        <span className="pc-rating">
          {rating}
          <svg width="9" height="9" viewBox="0 0 20 20" fill="#fff" aria-hidden>
            <path d="M10 .3l2.6 6 6.5.5-4.9 4.2 1.5 6.3L10 14l-5.7 3.3 1.5-6.3L.9 6.8l6.5-.5L10 .3z" />
          </svg>
        </span>
        <span className="pc-count">({count})</span>
        <span className="pc-trusted">
          <TrustedLogo />
        </span>
      </div>
    </div>
  );
}
