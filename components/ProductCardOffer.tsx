"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { formatPrice, seededRandom, specialOffer } from "@/lib/data";
import TrustedLogo from "./TrustedLogo";
import { buildRatings } from "@/lib/reviews";

/**
 * Catalog card in the "offer pill + Free Delivery" style used on category
 * pages and the product page's "Products For You" grid. Includes the same
 * Buy Now button as the home-feed card.
 */
export default function ProductCardOffer({ product }: { product: Product }) {
  const router = useRouter();
  const rnd = seededRandom(product.hash);
  const ratingCount = buildRatings(product.hash, product.image);
  const rating = ratingCount.average;
  const count = ratingCount.ratingCount;
  // const rating = (rnd() * (5 - 4) + 4).toFixed(1);
  // const count = Math.floor(rnd() * 600) + 100;
  const offer = specialOffer(product.hash, product.price);

  // Buy Now opens the product page (no direct add-to-cart).
  const buyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/product/${product.hash}`);
  };

  return (
    <div className="pc">
      <Link href={`/product/${product.hash}`} className="pc-link">
        <div className="pc-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            fetchPriority="low"
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

        <div className="pc-offer">
          <span className="pc-offer-ico">₹</span>
          ₹{offer.amount} with {offer.count} Special Offers
        </div>

        <p className="pc-free">Free Delivery</p>
      </Link>

      {/* Buy Now */}
      <button className="pc-buy" onClick={buyNow}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden>
          <path d="M4 5v14l8-7-8-7z" />
          <path d="M13 5v14l8-7-8-7z" />
        </svg>
        Buy Now
      </button>

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
