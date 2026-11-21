import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { adminConfigured, isAdmin } from "@/lib/admin-auth";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <LoginForm configured={adminConfigured()} />
    </div>
  );
}
