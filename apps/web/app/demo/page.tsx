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
          <p className="eyebrow">Bac a sable widget</p>
          <h1>Site client de test</h1>
          <p className="hero-statement">
            Utilisez le bouton Feedback en bas a droite pour creer un retour dans l&apos;inbox locale.
          </p>
          <p className="lede">
            Cette page charge le bundle widget local et l&apos;API locale. Les retours arrivent dans l&apos;inbox durable,
            puis peuvent etre envoyes vers GitHub ou GitLab selon la destination configuree pour le site.
          </p>
        </div>

        <div className="demo-layout">
          <section className="demo-content">
            <span className="status-badge needs_setup">Staging client</span>
            <h2>Refonte page contact</h2>
            <p>
              Le client peut cliquer n&apos;importe ou sur cette page, pointer un element visuel, ajouter une note, ou
              demander une capture du viewport.
            </p>
            <div className="demo-actions">
              <button>Demander un devis</button>
              <button className="quiet">Voir les services</button>
            </div>
          </section>

          <aside className="demo-sidebar">
            <h3>Scenarios a tester</h3>
            <ul className="check-list">
              <li>Note simple sur le contenu</li>
              <li>Pin sur le bouton principal</li>
              <li>Capture avec champs sensibles masques</li>
            </ul>
            <label>
              Email client
              <input type="email" defaultValue="client@example.com" />
            </label>
            <label>
              Commentaire prive
              <textarea defaultValue="Ce champ doit etre masque pendant la capture." />
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
