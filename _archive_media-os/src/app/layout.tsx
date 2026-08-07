import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube Media OS",
  description: "Evidence-led production system for a bilingual YouTube channel portfolio",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className="h-full bg-[#11100d]">
      <body className="min-h-full bg-[#11100d] text-[#f2efe6] antialiased">
        {children}
        <Toaster theme="dark" richColors position="bottom-right" />
      </body>
    </html>
  );
}
