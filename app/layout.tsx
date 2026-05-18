import type { Metadata } from "next";
import { Playfair_Display, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const notoSerifKr = Noto_Serif_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif-kr",
  display: "swap",
});

export const metadata: Metadata = {
  title: "고전문학 도우미",
  description: "고전문학 작품의 배경, 작가, 상징, 평론을 한자리에서 살펴보세요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${playfair.variable} ${notoSerifKr.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
