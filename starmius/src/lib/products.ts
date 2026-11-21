import "server-only";
import { getAllProducts as all, getCategories as cats } from "./store";
import type { Product } from "./types";

export { isPurchasable } from "./stock";

export const getAllProducts = all;
export const getProduct = async (slug: string) => (await all()).find((p) => p.slug === slug);
export const getFeaturedProducts = async () => (await all()).filter((p) => p.featured);
export const getCategories = cats;
export const getCategory = async (id: string) => (await cats()).find((c) => c.id === id);
export const getProductsByCategory = async (id?: string) => {
  const list = await all();
  return id ? list.filter((p) => p.categoryId === id) : list;
};
export const getRelatedProducts = async (p: Product, limit = 3) =>
  (await all()).filter((x) => x.categoryId === p.categoryId && x.slug !== p.slug).slice(0, limit);
