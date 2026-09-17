import type { Metadata } from "next";
import { Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "./context/LanguageContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import TransitAssistantWidget from "./components/transit-assistant/TransitAssistantWidget";

const notoSans = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSerif = Noto_Serif_TC({
  variable: "--font-noto-serif-tc",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "茶香花園民宿｜交通與班次查詢",
  description:
    "嘉義阿里山茶香花園民宿交通指南：台灣好行阿里山線公車即時可搭班次查詢、阿里山森林鐵路時刻與票價。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-Hant-TW"
      className={`${notoSans.variable} ${notoSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <LanguageProvider>
          <Header />
          {children}
          <Footer />
          <TransitAssistantWidget />
        </LanguageProvider>
      </body>
    </html>
  );
}
