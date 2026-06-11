import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/src/components/providers/theme-provider";
import { Analytics } from "@vercel/analytics/next"

// Police principale exposee a Tailwind via variable CSS.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Police monospace pour les textes techniques si besoin.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Metadonnees globales injectees par l'App Router Next.
  title: "OxalysTeach",
  description: "Plateforme moderne pour les professeurs passionnés",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `suppressHydrationWarning` evite les alertes quand le theme est applique cote client.
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        {/* Provider global : theme clair/sombre + analytics Vercel + page courante. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Analytics />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
