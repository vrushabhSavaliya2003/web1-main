import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import categoriesData from "@/data/categories.json";
import { PAGE_SIZE } from "./paging";
import { PRODUCT_COLUMNS } from "./productColumns";
import type { Product, Category, Review, HomeContent } from "./types";

// =============================================================================
// Storefront catalogue — read-only Supabase access.
//
// Every read is cached in Next's Data Cache for 1 hour (stale-while-
// revalidate) and tagged "catalog": shopper pages render without waiting on
// Supabase, and an admin save calls /api/revalidate (revalidateTag("catalog"))
// so edits still go live instantly for the very next visitor. Each function
// is also wrapped in React cache() so duplicate calls inside one request
// (generateMetadata pass + page pass) collapse into a single query.
// =============================================================================

const catalogClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/** Data-Cache wrapper: 1 hour SWR + "catalog" tag for admin-triggered purges. */
function cachedQuery<T>(key: string[], fn: () => Promise<T>): Promise<T> {
  return unstable_cache(fn, key, { revalidate: 3600, tags: ["catalog"] })();
}

const CATEGORY_COLUMNS = "id, slug, orig_slug, name";

/**
 * Category list. Admin-edited (see /admin/categories); the static JSON below
 * is only a fallback for the moment before migration 005 has been run, so the
 * storefront never breaks.
 */
export const DEFAULT_CATEGORIES = categoriesData as Category[];

export const getCategories = cache((): Promise<Category[]> =>
  cachedQuery(["categories"], async () => {
    try {
      const { data } = await catalogClient
        .from("categories")
        .select(CATEGORY_COLUMNS)
        .order("id");
      if (data && data.length > 0) {
        return (data as Array<{ id: number; slug: string; orig_slug: string; name: string }>).map(
          (c) => ({ id: c.id, slug: c.slug, origSlug: c.orig_slug, name: c.name })
        );
      }
    } catch {
      // fall through to the static list
    }
    return DEFAULT_CATEGORIES;
  })
);

/** Fallback home content = exactly what the home page shows today. */
export const DEFAULT_HOME_CONTENT: HomeContent = {
  banner1_url: "/banners/top.gif",
  banner1_link: "/category/women-fashion",
  banner1_alt: "Sale is live",
  banner2_url: "/banners/hero.png",
  banner2_link: "/category",
  banner2_alt: "Mega Sale",
  promo_text: "Get Upto 75% off on all products! Limited time offer.",
};

/** Home page content — banners + promo line. Hardcoded (the admin Home
 *  Content screen was removed), so this never touches the database. */
export const getHomeContent = (): HomeContent => DEFAULT_HOME_CONTENT;

export const getProductPage = cache(
  (page: number): Promise<{ products: Product[]; page: number; total_page: number }> => {
    const p = Math.max(1, page);
    const start = (p - 1) * PAGE_SIZE;
    return cachedQuery(["products-page", String(p)], async () => {
      try {
        const { data, count } = await catalogClient
          .from("products")
          .select(PRODUCT_COLUMNS, { count: "exact" })
          .order("order_number")
          .range(start, start + PAGE_SIZE - 1);

        return {
          products: (data as Product[]) ?? [],
          page: p,
          total_page: Math.max(1, Math.ceil((count ?? PAGE_SIZE) / PAGE_SIZE)),
        };
      } catch {
        return { products: [], page: p, total_page: 1 };
      }
    });
  }
);

export const getProductByHash = cache((hash: string): Promise<Product | null> =>
  cachedQuery(["product", hash], async () => {
    try {
      const { data } = await catalogClient
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("hash", hash)
        .maybeSingle();
      return (data as Product) ?? null;
    } catch {
      return null;
    }
  })
);

export const getProductsByCategory = cache((name: string): Promise<Product[]> =>
  cachedQuery(["category-products", name], async () => {
    try {
      const { data } = await catalogClient
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("category", name)
        .order("order_number");
      return (data as Product[]) ?? [];
    } catch {
      return [];
    }
  })
);

/** Same-category items first, then other categories to fill the grid. */
export const getForYouProducts = cache(
  (category: string, excludeHash: string, limit = 8): Promise<Product[]> =>
    cachedQuery(["for-you", category, excludeHash, String(limit)], async () => {
      try {
        // Both queries run in parallel — the fill query is not needed most of
        // the time, but running it eagerly avoids a second sequential wait.
        const [sameRes, othersRes] = await Promise.all([
          catalogClient
            .from("products")
            .select(PRODUCT_COLUMNS)
            .eq("category", category)
            .neq("hash", excludeHash)
            .order("order_number")
            .limit(limit),
          catalogClient
            .from("products")
            .select(PRODUCT_COLUMNS)
            .neq("category", category)
            .neq("hash", excludeHash)
            .order("order_number")
            .limit(limit),
        ]);
        const sameList = (sameRes.data as Product[]) ?? [];
        const othersList = (othersRes.data as Product[]) ?? [];
        return [...sameList, ...othersList].slice(0, limit);
      } catch {
        return [];
      }
    })
);

export const getAllProducts = cache((): Promise<Product[]> =>
  cachedQuery(["all-products"], async () => {
    try {
      const { data } = await catalogClient
        .from("products")
        .select(PRODUCT_COLUMNS)
        .order("order_number");
      return (data as Product[]) ?? [];
    } catch {
      return [];
    }
  })
);

/** Light rows (categories + image only) for the category-grid sample tiles. */
export const getCategorySamples = cache(
  (): Promise<Array<{ categories: string[]; image: string }>> =>
    cachedQuery(["category-samples"], async () => {
      try {
        const { data } = await catalogClient
          .from("products")
          .select("categories, image")
          .order("order_number");
        return (data as Array<{ categories: string[]; image: string }>) ?? [];
      } catch {
        return [];
      }
    })
);

export const getReviews = cache((): Promise<Review[]> =>
  cachedQuery(["reviews"], async () => {
    try {
      const { data } = await catalogClient
        .from("reviews")
        .select("id, name, rating, comment, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      return (data as Review[]) ?? [];
    } catch {
      return [];
    }
  })
);
