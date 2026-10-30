"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import AddToCartBar from "./AddToCartBar";
import OfferBanner from "./OfferBanner";
import { formatPrice, seededRandom } from "@/lib/data";


const SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"];
const storeNames = [
  "SHK Enterprises",
  "RocoCity Entrprise",
  "TechnoMart",
  "GadgetHub",
  "ElectroWorld",
  "SmartBuy",
  "MegaStore",
  "ShopEase",
  "QuickCart",
  "UrbanBazaar"
];
/**
 * Select Size + combo offers + Sold-by + sticky buy bar. One client component
 * so the chosen size is shared between the pills and the Add to Cart / Buy Now
 * buttons. The offer banner is read-only — the cart applies the discount
 * automatically based on the total number of items.
 */
export default function ProductPurchase({ product }: { product: Product }) {
  const [size, setSize] = useState("S");
   const rnd = seededRandom(product.hash);
  const Ratingcount = Math.floor(rnd() * 300) + 100;
  const productCount = Math.floor(rnd() * 40) + 10;
  const [storeName, setStoreName] = useState("");
  useEffect(() => {
    const randomIndex = Math.floor(
      Math.random() * storeNames.length
    );

    setStoreName(storeNames[randomIndex]);
  }, []);
  return (
    <>
      {/* Select Size — S is selected initially, only one at a time */}
      <div className="bg-white mt-2 px-4 py-4">
        <h6 className="font-bold text-[17px]">Select Size</h6>
        <div
          className="flex gap-2.5 mt-3 overflow-x-auto pb-0.5"
          style={{ scrollbarWidth: "none" }}
        >
          {SIZES.map((s) => {
            const active = s === size;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                aria-pressed={active}
                className="shrink-0 min-w-[58px] rounded-lg border px-3 py-2.5 text-[14px] font-semibold leading-none"
                style={
                  active
                    ? { borderColor: "#9f2089", color: "#9f2089", background: "#fff0fc" }
                    : { borderColor: "#e6e6ec", color: "#353543", background: "#fff" }
                }
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Combo offers — read-only banner, cart applies the discount itself */}
      <OfferBanner />

      {/* Sold by — hardcoded store card, View Shop has no behaviour yet */}
      <div className="bg-white mt-2 px-4 py-4">
        <p className="text-[12px] text-[#8b8ba3]">Sold by</p>
        <div className="flex items-center justify-between gap-3 mt-1.5">
          <div className="min-w-0">
            <p className="text-[15px] font-bold text-[#353543] truncate">{storeName || "Hari Enterprises"}</p>
            <div className="flex items-center gap-2 mt-1.5 text-[12px] text-[#8b8ba3]">
              <span className="inline-flex items-center gap-1 rounded bg-[#038d63] px-1.5 py-0.5 font-semibold text-white">
                4.1
                <svg width="8" height="8" viewBox="0 0 20 20" fill="#fff" aria-hidden>
                  <path d="M10 .3l2.6 6 6.5.5-4.9 4.2 1.5 6.3L10 14l-5.7 3.3 1.5-6.3L.9 6.8l6.5-.5L10 .3z" />
                </svg>
              </span>
              <span>{Ratingcount} Ratings</span>
              <span className="h-1 w-1 rounded-full bg-[#c9c9d1]" />
              <span>{productCount} Products</span>
            </div>
          </div>
          <button
            type="button"
            className="shrink-0 rounded border px-4 py-2 text-[13px] font-bold"
            style={{ color: "var(--brand)", borderColor: "var(--brand)", background: "#fff" }}
          >
            View Shop
          </button>
        </div>
      </div>

      <AddToCartBar product={product} size={size} />
    </>
  );
}
