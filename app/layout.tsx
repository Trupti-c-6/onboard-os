import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OnboardOS",
  description: "From deal closed to project started in 24 hours.",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full dark antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#090a0f] text-[#f5f5f7]">
        {children}
      </body>
    </html>
  );
}