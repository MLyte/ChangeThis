import type { Metadata } from "next";
import "./styles.css";
import { HiddenProjectShortcut } from "./hidden-project-shortcut";

export const metadata: Metadata = {
  title: "ChangeThis",
  description: "Client website feedback that turns into clean GitHub Issues."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <HiddenProjectShortcut />
      </body>
    </html>
  );
}
