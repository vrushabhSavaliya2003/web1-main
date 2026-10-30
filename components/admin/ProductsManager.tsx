"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import { invalidateAll } from "@/lib/admin/revalidate";

/**
 * Full catalogue table: search, filter, inline order-number editing
 * (shift-down semantics via set_product_position), edit links and delete.
 * Every write is RLS-gated in Supabase and goes live on the storefront
 * immediately (the storefront reads the catalogue with no-store).
 */
export default function ProductsManager({ initial }: { initial: Product[] }) {
  const router = useRouter();
  const [list, setList] = useState<Product[]>(initial);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [discount, setDiscount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Server re-fetch (after any mutation) delivers a fresh ordered list.
  useEffect(() => setList(initial), [initial]);

  const categories = useMemo(
    () => Array.from(new Set(initial.map((p) => p.category).filter(Boolean))).sort(),
    [initial]
  );
  const discounts = useMemo(
    () => Array.from(new Set(initial.map((p) => p.off).filter(Boolean))).sort(),
    [initial]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list.filter(
      (p) =>
        (!s || p.name.toLowerCase().includes(s) || p.hash.toLowerCase().includes(s)) &&
        (!cat || p.category === cat) &&
        (!discount || p.off >= discount && p.off < String(Number(discount) + 10))
    );
  }, [list, q, cat, discount]);

  const total = list.length;

  async function reorder(p: Product, target: number) {
    const pos = Math.max(1, Math.min(total, target));
    if (pos === p.order_number) return;
    setBusy(p.hash);
    setError("");
    const { error: rpcError } = await createClient().rpc("set_product_position", {
      p_hash: p.hash,
      p_pos: pos,
    });
    setBusy(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    invalidateAll();
    // Optimistic local shift so the table re-orders instantly.
    setList((prev) => {
      const old = p.order_number ?? prev.length;
      const shifted = prev.map((x) => {
        if (x.hash === p.hash) return { ...x, order_number: pos };
        const o = x.order_number ?? 0;
        if (old < pos && o > old && o <= pos) return { ...x, order_number: o - 1 };
        if (old > pos && o >= pos && o < old) return { ...x, order_number: o + 1 };
        return x;
      });
      return shifted.sort((a, b) => (a.order_number ?? 0) - (b.order_number ?? 0));
    });
    router.refresh();
  }

  async function remove(p: Product) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setBusy(p.hash);
    setError("");
    const { error: delError } = await createClient()
      .from("products")
      .delete()
      .eq("hash", p.hash);
    setBusy(null);
    if (delError) {
      setError(delError.message);
      return;
    }
    invalidateAll();
    setList((prev) => prev.filter((x) => x.hash !== p.hash));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{total}</span> products
        </p>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--brand)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Add Product
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name…"
          className="w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
        >
          <option value="">select discount</option>
          {/* {discounts.map((d) => ( */}
            <option key="50" value="50">
              50% to 60% off
            </option>
            <option key="60" value="60">
              60% to 70% off
            </option>
            <option key="70" value="70">
              70% to 80% off
            </option>
            <option key="80" value="80">
              80% to 90% off
            </option>
            <option key="90" value="90">
              90% to 100% off
            </option>
          {/* ))} */}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Product</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold hidden md:table-cell">Category</th>
              <th className="px-4 py-3 font-semibold w-24">Order</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.hash} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                <td className="px-4 py-2.5 text-gray-400">{p.order_number}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg bg-[#f7f7f9] object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${p.hash}/edit`}
                        className="block max-w-[280px] truncate font-medium text-gray-900 hover:underline"
                        title={p.name}
                      >
                        {p.name}
                      </Link>
                      <span className="text-xs text-gray-400">{p.hash.slice(0, 12)}…</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span className="font-semibold text-gray-900">{formatPrice(p.price)}</span>{" "}
                  <span className="text-xs text-gray-400 line-through">{formatPrice(p.mrp)}</span>
                  <div className="text-xs font-medium text-green-700">{p.off}</div>
                </td>
                <td className="px-4 py-2.5 text-gray-600 hidden md:table-cell">{p.category}</td>
                <td className="px-4 py-2.5">
                  <OrderInput
                    value={p.order_number ?? 0}
                    total={total}
                    busy={busy === p.hash}
                    onCommit={(n) => reorder(p, n)}
                  />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/admin/products/${p.hash}/edit`}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => remove(p)}
                      disabled={busy === p.hash}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  No products match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrderInput({
  value,
  total,
  busy,
  onCommit,
}: {
  value: number;
  total: number;
  busy: boolean;
  onCommit: (n: number) => void;
}) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);

  const commit = () => {
    const n = parseInt(v, 10);
    if (Number.isFinite(n) && n >= 1 && n <= total && n !== value) onCommit(n);
    else setV(String(value));
  };

  return (
    <input
      value={v}
      disabled={busy}
      onChange={(e) => setV(e.target.value.replace(/\D/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      inputMode="numeric"
      className="w-14 rounded-md border border-gray-200 px-2 py-1 text-center text-sm outline-none focus:border-gray-900 disabled:opacity-50"
      title="Order number (1 = first). Saving shifts the others down."
    />
  );
}
