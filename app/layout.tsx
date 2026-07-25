import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PeerReview™ — 3 Accepts or Perish",
  description: "全网最真实的 OpenReview 模拟器：一款关于 AutoResearch、LLM reviewer 与博士毕业线的学术生存讽刺游戏。",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "PeerReview™ — 3 Accepts or Perish",
    description: "全网最真实的 OpenReview 模拟器。科研不是零和博弈，评审系统说：未必。",
    images: ["/og.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "PeerReview™ — 3 Accepts or Perish",
    description: "全网最真实的 OpenReview 模拟器。科研不是零和博弈，评审系统说：未必。",
    images: ["/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
