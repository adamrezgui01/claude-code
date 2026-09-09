import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flashcards",
  description: "Révision par répétition espacée",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
