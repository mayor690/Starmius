import { redirect } from "next/navigation";
import { AdminApp } from "@/components/admin/admin-app";
import { isAdmin } from "@/lib/admin-auth";
import { getRawProducts, getCategories, getSettings } from "@/lib/store";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");
  const [products, categories, settings] = await Promise.all([getRawProducts(), getCategories(), getSettings()]);
  return <AdminApp initialProducts={products} initialCategories={categories} initialSettings={settings} />;
}
