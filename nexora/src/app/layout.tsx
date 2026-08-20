import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Nexora — AI Academic Companion",
  description: "AI-powered task management, study planning, and exam preparation companion for high school & university students.",
  icons: [
    { rel: 'icon', url: '/logo.png' },
    { rel: 'shortcut icon', url: '/logo.png' },
    { rel: 'apple-touch-icon', url: '/logo.png' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0B0F17] text-[#F1F5F9]">{children}</body>
    </html>
  );
}
