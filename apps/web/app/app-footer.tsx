import Image from "next/image";
import logoChangeThis from "./assets/logoChangeThis.png";
import { T } from "./i18n";

export function AppFooter() {
  return (
    <footer className="app-footer">
      <div>
        <strong>ChangeThis</strong>
        <Image src={logoChangeThis} alt="" aria-hidden="true" className="footer-logo" />
        <span><T k="footer.copy" /></span>
      </div>
      <nav aria-label="Footer">
        <a href="https://mathieuluyten.be" rel="noreferrer" target="_blank">
          <T k="footer.creator" />
        </a>
      </nav>
    </footer>
  );
}
