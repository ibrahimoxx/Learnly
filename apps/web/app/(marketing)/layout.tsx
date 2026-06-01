import { Suspense } from "react";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import AffiliateTracker from "@/components/shared/affiliate-tracker";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <AffiliateTracker />
      </Suspense>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
