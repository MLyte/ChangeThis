import Link from "next/link";
import Script from "next/script";
import { demoProject } from "../../lib/demo-project";

export default function DemoPage() {
  return (
    <main className="shell demo-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">CT</span>
          ChangeThis
        </Link>
        <nav className="nav" aria-label="Demo navigation">
          <Link className="link" href="/projects">Inbox</Link>
          <code>{demoProject.publicKey}</code>
        </nav>
      </header>

      <section className="demo-page">
        <div className="demo-copy">
          <p className="eyebrow">Demo widget</p>
          <h1>Site client de test</h1>
          <p className="hero-statement">
            Utilise le bouton Feedback en bas à droite pour envoyer un retour local.
          </p>
          <p className="lede">
            Cette page charge le bundle widget local et l&apos;API locale. Les retours génèrent un brouillon d&apos;issue
            provider-neutral, sans création réelle dans une destination pour l&apos;instant.
          </p>
        </div>

        <div className="demo-layout">
          <section className="demo-content">
            <h2>Refonte page contact</h2>
            <p>
              Le client peut cliquer n&apos;importe où sur cette page, pointer un élément visuel, ajouter une note, ou
              demander une capture du viewport.
            </p>
            <div className="demo-actions">
              <button>Demander un devis</button>
              <button className="quiet">Voir les services</button>
            </div>
          </section>

          <aside className="demo-sidebar">
            <h3>Éléments à tester</h3>
            <ul className="check-list">
              <li>Mode Note</li>
              <li>Mode Pin sur le bouton principal</li>
              <li>Mode Capture avec champs masqués</li>
            </ul>
            <label>
              Email client
              <input type="email" defaultValue="client@example.com" />
            </label>
            <label>
              Commentaire privé
              <textarea defaultValue="Ce champ doit être masqué pendant la capture." />
            </label>
          </aside>
        </div>
      </section>

      <Script
        src="/widget.global.js"
        data-project={demoProject.publicKey}
        data-endpoint="/api/public/feedback"
        strategy="afterInteractive"
      />
    </main>
  );
}
