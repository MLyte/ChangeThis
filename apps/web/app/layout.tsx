import type { Metadata } from "next";
import Script from "next/script";
import "./styles.css";
import { AppToaster } from "./app-toaster";
import { HiddenProjectShortcut } from "./hidden-project-shortcut";
import { LanguageProvider } from "./i18n";

export const metadata: Metadata = {
  title: "ChangeThis",
  description: "Widget de feedback client qui transforme les retours en issues exploitables."
};

const betaFeedbackProjectKey = process.env.NEXT_PUBLIC_CHANGETHIS_PROJECT_KEY?.trim();

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr-BE" suppressHydrationWarning data-scroll-behavior="smooth">
      <body>
        <LanguageProvider>
          {children}
          <HiddenProjectShortcut />
          <AppToaster />
        </LanguageProvider>
        {betaFeedbackProjectKey ? (
          <Script
            id="changethis-beta-feedback-widget"
            src="/widget.js"
            data-project={betaFeedbackProjectKey}
            data-locale="fr"
            data-position="bottom-right"
            data-variant="subtle"
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
