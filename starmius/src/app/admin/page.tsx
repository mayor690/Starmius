import { redirect } from "next/navigation";
import { AdminApp } from "@/components/admin/admin-app";
import { getAdminSession } from "@/lib/admin-auth";
import { getRawProducts, getCategories, getSettings } from "@/lib/store";

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  // Staff get the payments tab only, so the catalogue and settings are never sent to their browser.
  if (session.role !== "owner") {
    return <AdminApp role="payments" who={session.name} initialProducts={[]} initialCategories={[]} initialSettings={null} paystackConfigured={false} />;
  }
  const [products, categories, settings] = await Promise.all([getRawProducts(), getCategories(), getSettings()]);
  return <AdminApp role="owner" who="Owner" initialProducts={products} initialCategories={categories} initialSettings={settings} paystackConfigured={Boolean(process.env.PAYSTACK_SECRET_KEY)} />;
}
