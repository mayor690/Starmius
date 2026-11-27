import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { site } from "@/data/site";
import { AuthProvider } from "@/components/auth-provider";
import { CartProvider } from "@/components/cart-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CatalogProvider } from "@/components/catalog-provider";
import { Analytics } from "@/components/analytics";
import { BannerSlot } from "@/components/banner-slot";
import { HideOnAdmin } from "@/components/hide-on-admin";
import { getAllProducts, getBank, getCarouselSeconds, getPaystackOn, getShipping, getUsdc, getWhatsappBase } from "@/lib/store";
import "./globals.css";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-cormorant", display: "swap" });
const sans = Jost({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-jost", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} ${site.descriptor} | ${site.tagline}`, template: `%s | ${site.name} ${site.descriptor}` },
  description: site.description,
  openGraph: { siteName: `${site.name} ${site.descriptor}`, locale: site.locale, type: "website", images: [site.ogImage] },
};

export const viewport: Viewport = { themeColor: "#fdfbf7" };

// Catalogue and contact details are edited by the owner at runtime, so pages render per request.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [products, whatsappBase, shipping, carouselSeconds, usdc, bank, paystackOn] = await Promise.all([getAllProducts(), getWhatsappBase(), getShipping(), getCarouselSeconds(), getUsdc(), getBank(), getPaystackOn()]);
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <AuthProvider>
          <CatalogProvider products={products} whatsappBase={whatsappBase} shipping={shipping} carouselMs={carouselSeconds * 1000} usdc={usdc} bank={bank} paystackOn={paystackOn}>
            <CartProvider>
              <Analytics />
              <HideOnAdmin><BannerSlot placement="top" /><Header /></HideOnAdmin>
              <HideOnAdmin><BannerSlot placement="popup" /></HideOnAdmin>
              <main>{children}</main>
              <HideOnAdmin><Footer /></HideOnAdmin>
            </CartProvider>
          </CatalogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
