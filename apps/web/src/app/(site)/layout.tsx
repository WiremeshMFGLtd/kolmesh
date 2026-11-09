import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { QuoteDrawer } from "@/components/site/quote-drawer";
import { Analytics } from "@/components/site/analytics";
import { getCategories, getSettings } from "@/lib/api";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [categories, settings] = await Promise.all([getCategories(), getSettings()]);
  return (
    <>
      <Header categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer categories={categories} settings={settings} />
      <QuoteDrawer />
      <Analytics />
    </>
  );
}
