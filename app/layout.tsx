import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "RetroBin",
  description: "My retro gaming stuff.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
