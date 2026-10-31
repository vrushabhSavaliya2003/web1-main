"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { uploadStoreImage } from "@/lib/supabase/storage";
import { invalidateAll } from "@/lib/admin/revalidate";
import { ADDITIONAL_INFO_FIELDS } from "@/lib/productDetails";

/** Max gallery photos per product (migration 001's `images` column holds them). */
const IMAGE_SLOTS = 10;

function randomHash(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function roundOff(price: string, mrp: string): string {
  const p = parseFloat(price);
  const m = parseFloat(mrp);
  if (!Number.isFinite(p) || !Number.isFinite(m) || m <= 0 || p > m) return "";
  return `${Math.round((1 - p / m) * 100)}% off`;
}

export default function ProductForm({
  product,
  categories,
  nextOrder,
}: {
  product: Product | null;
  categories: string[];
  nextOrder: number;
}) {
  const router = useRouter();
  const editing = Boolean(product);

  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [mrp, setMrp] = useState(product ? String(product.mrp) : "");
  const [off, setOff] = useState(product?.off ?? "");
  const [badge, setBadge] = useState(product?.badge ?? "");
  const [category, setCategory] = useState(product?.category ?? categories[0] ?? "");
  const [order, setOrder] = useState(String(product?.order_number ?? nextOrder));
  const [images, setImages] = useState<string[]>(() => {
    const arr = Array.from({ length: IMAGE_SLOTS }, (_, i) => product?.images?.[i] ?? "");
    if (!arr.some(Boolean) && product?.image) arr[0] = product.image;
    return arr;
  });
  const [fabric, setFabric] = useState(product?.fabric ?? "");
  const [color, setColor] = useState(product?.color ?? "");
  const [pattern, setPattern] = useState(product?.pattern ?? "");
  const [fitShape, setFitShape] = useState(product?.fit_shape ?? "");
  const [infoValues, setInfoValues] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const k of ADDITIONAL_INFO_FIELDS) map[k] = "";
    for (const r of product?.additional_info ?? []) if (r.label) map[r.label] = r.value ?? "";
    return map;
  });

  const [uploading, setUploading] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function onFile(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image is larger than 2 MB — please upload a smaller file.");
      return;
    }
    setUploading(idx);
    setError("");
    try {
      const url = await uploadStoreImage(file, "products");
      setImages((prev) => prev.map((v, i) => (i === idx ? url : v)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Check the storage bucket in Supabase.");
    } finally {
      setUploading(null);
    }
  }

  const setPriceField = (v: string) => {
    setPrice(v);
    setOff(roundOff(v, mrp));
  };
  const setMrpField = (v: string) => {
    setMrp(v);
    setOff(roundOff(price, v));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const p = parseFloat(price);
    const m = parseFloat(mrp);
    const desiredOrder = parseInt(order, 10);

    if (!name.trim()) return setError("Product name is required.");
    if (!Number.isFinite(p) || p < 0) return setError("Enter a valid selling price.");
    if (!Number.isFinite(m) || m < 0) return setError("Enter a valid MRP.");
    if (!category) return setError("Pick a category.");
    if (!images[0]) return setError("Upload at least the first product image.");
    if (!Number.isFinite(desiredOrder) || desiredOrder < 1) return setError("Order number must be 1 or more.");

    const cleanImages = images.slice(0, IMAGE_SLOTS).filter(Boolean);
    const payload = {
      name: name.trim(),
      price: p,
      mrp: m,
      off: off.trim(),
      image: cleanImages[0],
      images: cleanImages,
      badge: badge.trim(),
      categories: [category],
      category,
      fabric: fabric.trim(),
      color: color.trim(),
      pattern: pattern.trim(),
      fit_shape: fitShape.trim(),
      // Only filled Additional Details fields are stored, in reference order.
      additional_info: ADDITIONAL_INFO_FIELDS.filter((k) => infoValues[k]?.trim()).map((k) => ({
        label: k,
        value: infoValues[k].trim(),
      })),
    };

    setSaving(true);
    const supabase = createClient();
    let hash = product?.hash;

    if (!product) {
      hash = randomHash();
      const { error: insertError } = await supabase.from("products").insert({
        ...payload,
        hash,
        order_number: nextOrder,
      });
      if (insertError) {
        setSaving(false);
        return setError(insertError.message);
      }
    } else {
      const { error: updateError } = await supabase
        .from("products")
        .update(payload)
        .eq("hash", product.hash);
      if (updateError) {
        setSaving(false);
        return setError(updateError.message);
      }
    }

    // Position the product (shift-down). New rows are appended at the end
    // first, then moved to the requested slot.
    if (desiredOrder !== (product ? product.order_number : nextOrder)) {
      const { error: rpcError } = await supabase.rpc("set_product_position", {
        p_hash: hash,
        p_pos: Math.min(desiredOrder, nextOrder),
      });
      if (rpcError) {
        setSaving(false);
        return setError(rpcError.message);
      }
    }

    invalidateAll();
    router.push("/admin/products");
    router.refresh();
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900";
  const labelCls = "block text-sm font-medium text-gray-800";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* Images */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900">Product images (up to {IMAGE_SLOTS})</h3>
        <p className="mt-1 text-xs text-gray-500">
          First image is the main one. Square 1:1 recommended, max 2 MB each.
          Uploaded images go live on the storefront instantly.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: IMAGE_SLOTS }, (_, i) => i).map((idx) => (
            <div key={idx}>
              <label className={labelCls}>
                Image {idx + 1}
                {idx === 0 && <span className="text-red-500"> *</span>}
              </label>
              <div className="mt-1 flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-[#fafafa]">
                {images[idx] ? (
                  <div className="relative h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={images[idx]} alt="" className="h-full w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.map((v, i) => (i === idx ? "" : v)))}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                      aria-label="Remove image"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-gray-400 hover:text-gray-600">
                    {uploading === idx ? (
                      <span className="text-xs">Uploading…</span>
                    ) : (
                      <>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M12 16V4m0 0L7 9m5-5l5 5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
                        </svg>
                        <span className="text-xs">Click to upload</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading !== null}
                      onChange={(e) => onFile(idx, e)}
                    />
                  </label>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Details */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900">Details</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={`${labelCls} sm:col-span-2`}>
            Name <span className="text-red-500">*</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="20Kg Atta, 5Kg Sugar…"
              className={inputCls}
            />
          </label>

          <label className={labelCls}>
            Selling price (₹) <span className="text-red-500">*</span>
            <input
              value={price}
              onChange={(e) => setPriceField(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="499"
              className={inputCls}
            />
          </label>

          <label className={labelCls}>
            MRP (₹) <span className="text-red-500">*</span>
            <input
              value={mrp}
              onChange={(e) => setMrpField(e.target.value.replace(/[^\d.]/g, ""))}
              inputMode="decimal"
              placeholder="2999"
              className={inputCls}
            />
          </label>

          <label className={labelCls}>
            Discount (calculated automatically)
            <input value={off} readOnly placeholder="Calculated from MRP and price" className={inputCls} />
          </label>

          <label className={labelCls}>
            Badge (optional)
            <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder='e.g. "Hot Sell"' className={inputCls} />
          </label>

          <label className={labelCls}>
            Category <span className="text-red-500">*</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className={labelCls}>
            Order number <span className="text-red-500">*</span>
            <input
              value={order}
              onChange={(e) => setOrder(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className={inputCls}
            />
            <span className="mt-1 block text-xs text-gray-500">
              1–2 is the top row, 3–4 next, and so on. Saving shifts the other
              products down.
            </span>
          </label>
        </div>
      </section>

      {/* Product highlights */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900">Product highlights</h3>
        <p className="mt-1 text-xs text-gray-500">
          Shown in the &quot;Product Highlights&quot; grid on the storefront. Leave
          blank and the section is hidden.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelCls}>
            Fabric
            <input value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder="e.g. Poly Blend" className={inputCls} />
          </label>
          <label className={labelCls}>
            Color
            <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Cream" className={inputCls} />
          </label>
          <label className={labelCls}>
            Pattern
            <input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="e.g. Printed" className={inputCls} />
          </label>
          <label className={labelCls}>
            Fit/Shape
            <input value={fitShape} onChange={(e) => setFitShape(e.target.value)} placeholder="e.g. Regular" className={inputCls} />
          </label>
        </div>
      </section>

      {/* Additional details */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900">Additional details</h3>
        <p className="mt-1 text-xs text-gray-500">
          Shown inside the collapsible &quot;Additional Details&quot; section on the
          storefront — only filled fields are displayed, in this order.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ADDITIONAL_INFO_FIELDS.map((k) => (
            <label key={k} className={labelCls}>
              {k}
              <input
                value={infoValues[k]}
                onChange={(e) =>
                  setInfoValues((prev) => ({ ...prev, [k]: e.target.value }))
                }
                placeholder="Leave blank to hide"
                className={inputCls}
              />
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ background: "var(--brand)" }}
        >
          {saving ? "Saving…" : editing ? "Save changes" : "Create product"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
