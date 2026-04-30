import type { Metadata } from "next";
import "./styles.css";
import { AppToaster } from "./app-toaster";
import { HiddenProjectShortcut } from "./hidden-project-shortcut";
import { LanguageProvider } from "./i18n";

export const metadata: Metadata = {
  title: "ChangeThis",
  description: "Widget de feedback client qui transforme les retours en issues exploitables."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr-BE" suppressHydrationWarning data-scroll-behavior="smooth">
      <body>
        <LanguageProvider>
          {children}
          <HiddenProjectShortcut />
          <AppToaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
