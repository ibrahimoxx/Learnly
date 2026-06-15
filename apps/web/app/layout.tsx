import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";
import { InstallPrompt } from "@/components/shared/install-prompt";
import { PlatformBanner } from "@/components/shared/platform-banner";
import "./globals.css";
import { cn } from "@/lib/utils";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-heading" });

export const viewport: Viewport = {
  themeColor: "#a435f0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    template: "%s | Learnly",
    default: "Learnly — Learn Without Limits",
  },
  description: "Online learning marketplace with thousands of expert-led courses.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Learnly",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <ClerkProvider>
      <html lang={locale} className={cn("font-sans", manrope.variable, fraunces.variable)}>
        <head>
          <link rel="preconnect" href="https://clerk.learnly.dev" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        </head>
        <body>
          <NextIntlClientProvider messages={messages}>
            <PlatformBanner />
            <Providers>{children}</Providers>
            <Toaster richColors position="bottom-right" />
            <InstallPrompt />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
