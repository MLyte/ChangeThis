import { demoAppEnvironment, demoProject } from "../../lib/demo-project";
import { AppFooter } from "../app-footer";
import { AppHeader } from "../app-header";
import { DemoTestPanel } from "./demo-test-panel";

export default function DemoPage() {
  return (
    <main className="shell demo-shell">
      <AppHeader
        navItems={[
          { href: "/projects", labelKey: "nav.issues" },
          { href: "/settings", labelKey: "nav.settings" }
        ]}
      />

      <section className="demo-page">
        <nav className="demo-client-nav" aria-label="Navigation Atelier Nova">
          <strong>Atelier Nova</strong>
          <div>
            <a href="#collection">Objets</a>
            <a href="#journal">Journal</a>
            <a href="#contact">Contact</a>
          </div>
          <a className="demo-client-cta" href="#collection">Voir la collection</a>
        </nav>

        <div className="demo-client-hero">
          <div className="demo-client-copy">
            <p className="demo-kicker">Maison fictive · staging client</p>
            <h1>Des objets calmes pour les maisons vivantes.</h1>
            <p>
              Bienvenue sur un faux site client. Explorez la page comme un visiteur normal:
              si quelque chose vous semble confus, cassé ou mal placé, utilisez le bouton <strong>Feedback</strong> en bas à droite.
            </p>
            <div className="demo-client-actions">
              <a href="#collection">Découvrir les pièces</a>
              <a href="#feedback-guide">Comment tester ?</a>
            </div>
          </div>

          <div className="demo-visual-card" aria-label="Produit fictif Atelier Nova">
            <span>Nouvelle série</span>
            <div className="demo-object-shape" />
            <strong>Lampe Silex</strong>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat sans urgence.</p>
          </div>
        </div>

        <section className="demo-feedback-guide" id="feedback-guide" aria-labelledby="demo-feedback-title">
          <div>
            <p className="demo-kicker">Mode d&apos;emploi</p>
            <h2 id="demo-feedback-title">Vous jouez le rôle d&apos;un client qui remarque un problème.</h2>
          </div>
          <ol>
            <li><strong>Repérez</strong> un texte flou, un bouton ambigu, un espace étrange ou une information manquante.</li>
            <li><strong>Cliquez sur “Feedback”</strong>, le bouton flottant en bas à droite de l&apos;écran.</li>
            <li><strong>Ajoutez une note, une épingle ou une capture</strong>. Le retour arrivera ensuite dans Issues.</li>
          </ol>
        </section>

        <section className="demo-product-grid" id="collection" aria-label="Collection fictive">
          {[
            ["Lampe Silex", "Lumière douce en grès chamotté, pensée pour les bureaux calmes."],
            ["Vase Brume", "Silhouette irrégulière, émail laiteux, fleurs du marché et branches sèches."],
            ["Table Orme", "Petite table basse en bois huilé, dessinée pour les salons compacts."]
          ].map(([title, copy]) => (
            <article className="demo-product-card" key={title}>
              <div className="demo-product-image" />
              <span>Atelier Nova</span>
              <h3>{title}</h3>
              <p>{copy} Lorem ipsum dolor sit amet, sed do eiusmod tempor.</p>
            </article>
          ))}
        </section>

        <section className="demo-editorial-band" id="journal">
          <p>“Nous dessinons des pièces qui vieillissent bien, pas des tendances. Si cette page vous semble imprécise, signalez-le avec le bouton Feedback.”</p>
        </section>

        <section className="demo-history-section" aria-labelledby="demo-history-title">
          <div>
            <p className="demo-kicker">Depuis 2018</p>
            <h2 id="demo-history-title">Une maison fictive avec un passé visible.</h2>
            <p>
              Atelier Nova a commencé dans un petit atelier partagé à Namur. Depuis, la marque publie ses collections par saisons,
              garde les retours clients et améliore ses pages avant chaque lancement.
            </p>
          </div>
          <ol className="demo-timeline">
            <li><span>2018</span><strong>Premier atelier</strong><p>Trois prototypes, une newsletter artisanale et beaucoup de café.</p></li>
            <li><span>2021</span><strong>Collection Brume</strong><p>Les premières pièces en grès rejoignent les boutiques partenaires.</p></li>
            <li><span>2024</span><strong>Portail client</strong><p>Le site ajoute les demandes de devis, le suivi et les retours après livraison.</p></li>
          </ol>
        </section>

        <section className="demo-proof-grid" aria-label="Historique client fictif">
          {[
            ["12 février 2026", "Claire M.", "La lampe est parfaite, mais le choix de finition n'était pas clair sur mobile."],
            ["03 mars 2026", "Patrick D.", "Très beau site. J'ai eu un doute sur les délais de livraison avant de commander."],
            ["18 avril 2026", "Nadia P.", "Le formulaire contact fonctionne, mais je ne savais pas si ma demande était bien envoyée."]
          ].map(([date, name, quote]) => (
            <article className="demo-proof-card" key={`${date}-${name}`}>
              <span>{date}</span>
              <strong>{name}</strong>
              <p>“{quote}”</p>
            </article>
          ))}
        </section>

        <section className="demo-client-content" id="contact">
          <div>
            <p className="demo-kicker">Page volontairement imparfaite</p>
            <h2>Quelques zones sont là pour provoquer des retours.</h2>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi cursus, lectus sed consequat fermentum,
              laisse volontairement quelques formulations vagues pour tester les commentaires.
            </p>
          </div>
          <form className="demo-contact-card">
            <label>
              Votre e-mail
              <input type="email" defaultValue="nadia.petit@example.test" />
            </label>
            <label>
              Message privé
              <textarea defaultValue="Ce champ sert à tester le masquage pendant une capture." />
            </label>
            <button type="button">Envoyer la demande</button>
          </form>
        </section>

        <DemoTestPanel publicKey={demoProject.publicKey} />
      </section>

      <AppFooter />

      <script
        src="/widget.global.js"
        data-project={demoProject.publicKey}
        data-endpoint="/api/public/feedback"
        data-environment={demoAppEnvironment.environment}
        data-release={demoAppEnvironment.release}
        data-app-version={demoAppEnvironment.appVersion}
        data-build-id={demoAppEnvironment.buildId}
        data-commit-sha={demoAppEnvironment.commitSha}
        data-branch={demoAppEnvironment.branch}
        data-test-run-id={demoAppEnvironment.testRunId}
        data-scenario={demoAppEnvironment.scenario}
        data-customer={demoAppEnvironment.customer}
        async
      />
    </main>
  );
}
