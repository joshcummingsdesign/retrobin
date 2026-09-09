import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Retro Log",
  description: "A personal collection of retro consoles, games, and accessories.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
