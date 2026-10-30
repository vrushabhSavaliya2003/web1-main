import Link from "next/link";
import { getReviews } from "@/lib/catalog";
import { seededRandom } from "@/lib/data";
import type { Product, Review as DbReview } from "@/lib/types";
import type { RatingSummary } from "@/lib/reviews";

function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    "Posted on " +
    d.toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  );
}

/**
 * Ratings & Reviews block — streamed in after the page shell (Suspense), so
 * the hero/price/buy bar never wait on the reviews query.
 */
export default async function ReviewsSection({
  product,
  ratings,
}: {
  product: Product;
  ratings: RatingSummary;
}) {
  const sharedReviews = await getReviews();

  // Shared reviews (same on every product) — each rendered with THIS product's
  // image. Falls back to the seeded reviews if the reviews table is empty.
  const reviewCards = (sharedReviews.length > 0 ? sharedReviews : []).map((r: DbReview) => {
    const helpfulRnd = seededRandom("helpful:" + r.id);
    return {
      name: r.name,
      rating: Number(r.rating).toFixed(1),
      date: formatReviewDate(r.created_at) || "Posted on October 1, 2025",
      text: r.comment,
      helpful: 50 + Math.floor(helpfulRnd() * 850),
      image: product.image,
    };
  });
  const shownReviews =
    reviewCards.length > 0 ? reviewCards : ratings.reviews.map((r) => ({ ...r, image: product.image }));

  return (
    <div className="bg-white mt-2" id="reviews">
      {/* heading block — padding 1px 16px */}
      <div className="px-4 py-px">
        <h6 className="font-bold text-[17px]">Product Ratings &amp; Reviews</h6>
      </div>

      {/* count wrapper — padding 4px 16px */}
      <div className="flex gap-4 px-4 py-1">
        <div className="shrink-0 w-[62px]">
          {/* average — 35px bold greenBase + 12px star, baseline-aligned */}
          <div className="flex items-center gap-1">
            <span className="text-[35px] leading-none font-bold text-[#038d63]">{ratings.average}</span>
            <Star size={12} fill="#038d63" />
          </div>
          <div className="text-[11px] text-[#8b8ba3] mt-2 leading-tight">{ratings.ratingCount} Ratings,</div>
          <div className="text-[11px] text-[#8b8ba3] mt-1.5 leading-tight">{ratings.reviewCount} Reviews</div>
        </div>
        <div className="flex-1 space-y-1.5 pt-1">
          {ratings.buckets.map((b) => (
            <div key={b.label} className="flex items-center text-[12px]">
              {/* .rating_label — 12px demi #212529, right-aligned, margin-right 12px */}
              <span className="w-[61px] mr-3 text-right text-[#212529] font-semibold shrink-0">{b.label}</span>
              <span className="flex-1 h-[6px] rounded-full bg-[#eaeaef] overflow-hidden">
                <span className="block h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
              </span>
              <span className="w-9 ml-3 text-right text-[#212529]">
                {b.count}
                </span>
            </div>
          ))}
        </div>
      </div>

      {/* comments — each card padding 10px 16px, separated by a full-width rule */}
      <div className="mt-2">
        {shownReviews.map((r, i) => (
          <div key={i} className={`px-4 py-2.5 ${i > 0 ? "border-t border-[#eaeaef]" : ""}`}>
            <div className="flex items-center gap-2">
              <UserAvatar />
              <span className="text-[13px] font-semibold text-[#212529]">{r.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 bg-[#038d63] text-white text-[13px] font-semibold px-2 py-0.5 rounded-[10px]">
                {r.rating}
                <Star size={8} />
              </span>
              <span className="text-[13px] text-[#353543]">{r.date}</span>
            </div>
            <p className="text-[13px] mt-2 text-[#353543]">{r.text}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {/* <img src={r.image} alt="" width={48} height={48} className="w-12 h-12 object-cover rounded mt-2 bg-[#f7f7f9]" loading="lazy" decoding="async" /> */}
            <p className="text-[13px] text-[#666] mt-2 flex items-center gap-1.5">
              {/* filled thumbs-up, matching the reference glyph */}
              <svg width="15" height="15" viewBox="0 0 16 16" fill="#666" aria-hidden>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M4.712 5.245 8.68 1.13a1.039 1.039 0 0 1 1.51-.008c.258.268.366.647.294 1.018l-.68 3.402h4.046c1.54 0 2.578 1.635 1.977 3.106L13.492 14.3c-.229.542-.745.899-1.318.899H5.73c-.788 0-1.432-.669-1.432-1.486V6.293c0-.394.15-.773.415-1.048Zm-1.847 8.471c0 .818-.645 1.486-1.433 1.486-.787 0-1.432-.668-1.432-1.486V7.773c0-.817.645-1.486 1.432-1.486.788 0 1.433.67 1.433 1.486v5.943Z"
                />
              </svg>
              Helpful ({r.helpful})
            </p>
          </div>
        ))}
      </div>

      <Link href="#reviews" className="block px-4 pb-4 pt-2 text-[13px] font-bold tracking-wide" style={{ color: "var(--brand)" }}>
        VIEW ALL REVIEWS ›
      </Link>
    </div>
  );
}

function Star({ size = 9, fill = "#fff" }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={fill} aria-hidden>
      <path d="M10 .3l2.6 6 6.5.5-4.9 4.2 1.5 6.3L10 14l-5.7 3.3 1.5-6.3L.9 6.8l6.5-.5L10 .3z" />
    </svg>
  );
}

function UserAvatar() {
  return (
    <span className="w-7 h-7 rounded-full bg-[#F7F9FF] grid place-items-center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#c7d3f0">
        <circle cx="12" cy="9" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0z" />
      </svg>
    </span>
  );
}
