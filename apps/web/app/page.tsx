import Link from "next/link";

const benefits = [
  {
    title: "Un retour = un contexte complet",
    body: "URL, chemin, titre, navigateur, viewport, langue, pin et capture sont regroupés dans une seule charge utile."
  },
  {
    title: "Des projets séparés",
    body: "Chaque site utilise une clé publique et ses domaines autorisés, avec sa destination d'issue propre."
  },
  {
    title: "Prêt pour GitHub et GitLab",
    body: "Le dashboard prépare les intégrations provider et la liaison namespace, repository et URL publique."
  },
  {
    title: "Lisible par l'IA",
    body: "Les issues sont structurées pour être triées, résumées et transformées en corrections par Codex."
  }
];

const workflow = [
  {
    step: "01",
    title: "Installer le widget",
    body: "Chargez /widget.js sur un site client, ajoutez la clé projet publique et choisissez le libellé du bouton."
  },
  {
    step: "02",
    title: "Pointer le problème",
    body: "Le client laisse une note, épingle un élément ou joint une capture sans compte et sans quitter la page."
  },
  {
    step: "03",
    title: "Router vers le bon repo",
    body: "ChangeThis valide l'origine, construit un brouillon d'issue et l'associe au projet configure."
  }
];

const supportedProjects = ["ChangeThis", "OptiMaster", "Andenne Bears", "Yoda Carrosserie"];

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">CT</span>
          ChangeThis
        </Link>
        <nav className="nav" aria-label="Main navigation">
          <a className="link" href="#workflow">Workflow</a>
          <Link className="link" href="/projects">Projects</Link>
          <a className="link" href="/demo">Demo</a>
          <a className="link hide-mobile" href="https://github.com/MLyte/ChangeThis">GitHub</a>
          <a className="button" href="mailto:hello@changethis.dev?subject=ChangeThis%20beta">Join waitlist</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Client feedback to issues</p>
          <h1>ChangeThis</h1>
          <p className="hero-statement">
            Le widget qui transforme un &quot;change this&quot; en issue exploitable.
          </p>
          <blockquote className="hero-quote" cite="https://changethis.dev">
            <p>&laquo; Apprendre des autres, apprendre aux autres. &raquo;</p>
            <footer>— Mantra produit ChangeThis</footer>
          </blockquote>
          <p className="lede">
            ChangeThis collecte notes, pins et captures sur vos sites de staging, valide l&apos;origine du projet,
            prépare un brouillon d&apos;issue propre et vous aide à le router vers le bon repository.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/projects">Configurer les projets</Link>
            <a className="button secondary-button" href="#workflow">Voir le workflow</a>
          </div>
          <p className="microcopy">Open source, multi-projets, prêt pour les intégrations provider.</p>
        </div>

        <ProductScene />
      </section>

      <section className="workflow-band" id="workflow">
        <div className="section-heading">
          <p className="eyebrow">Workflow</p>
          <h2>Du commentaire client au brouillon d&apos;issue contextualisé</h2>
        </div>
        <div className="steps">
          {workflow.map((item) => (
            <article className="step" key={item.step}>
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading compact">
          <p className="eyebrow">Pourquoi</p>
          <h2>Le feedback devient une donnée produit, pas une conversation perdue.</h2>
        </div>
        <div className="benefit-grid">
          {benefits.map((benefit) => (
            <article className="benefit" key={benefit.title}>
              <h3>{benefit.title}</h3>
              <p>{benefit.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="install-section">
        <div>
          <p className="eyebrow">État du produit</p>
          <h2>Le socle est en place pour relier sites clients et repositories.</h2>
          <p className="lede">
            Le MVP ne se limite plus à une démo locale. Il expose un bundle widget versionné, une API publique de
            feedback, un modèle de projets autorisés et un dashboard de préparation des destinations d&apos;issues.
          </p>
          <ul className="check-list">
            <li>Bundle servi via /widget.js et /widget.global.js</li>
            <li>Projets publics avec domaines autorisés</li>
            <li>Brouillons provider-neutral pour GitHub ou GitLab</li>
            <li>Configuration de production documentée</li>
          </ul>
        </div>
        <pre className="code-block"><code>{`<script
  src="https://app.changethis.dev/widget.js"
  data-project="project_public_key"
  data-button-label="Feedback">
</script>`}</code></pre>
      </section>

      <section className="section">
        <div className="section-heading compact">
          <p className="eyebrow">Miroirs pilotes</p>
          <h2>Un seul outil pour plusieurs sites et plusieurs repos.</h2>
          <p>
            ChangeThis sert de couche de feedback pour des pages vitrines, des produits open source et des sites
            clients. Chaque projet garde son origine autorisée, son libellé et sa destination d&apos;issue.
          </p>
        </div>
        <div className="benefit-grid">
          {supportedProjects.map((project) => (
            <article className="benefit" key={project}>
              <h3>{project}</h3>
              <p>Clé publique, origine autorisée et repository cible configurables dans ChangeThis.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <div>
          <p className="eyebrow">En construction</p>
          <h2>Le feedback client peut maintenant entrer dans votre chaîne de livraison.</h2>
          <p>
            La prochaine étape consiste à finaliser les credentials provider, persister les retours et automatiser la
            création d&apos;issues depuis les brouillons validés.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="button light-button" href="/projects">Ouvrir le dashboard</Link>
          <a className="button dark-outline" href="https://github.com/MLyte/ChangeThis">Suivre sur GitHub</a>
        </div>
      </section>
    </main>
  );
}

function ProductScene() {
  return (
    <div className="product-scene" aria-label="ChangeThis product workflow preview">
      <div className="stage-window">
        <div className="browser-bar">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
          <span className="url">staging.client-site.dev</span>
        </div>
        <div className="stage-page">
          <div className="site-nav">
            <span />
            <span />
            <span />
          </div>
          <div className="site-hero">
            <div>
              <div className="mock-line wide" />
              <div className="mock-line" />
              <button className="mock-cta">Demander un devis</button>
            </div>
            <div className="mock-media" />
          </div>
          <button className="feedback-pill">Preview</button>
          <span className="pin">1</span>
          <div className="client-note">
            <strong>Le CTA manque de contraste sur mobile</strong>
            <span>Pin + screenshot, projet: client-site</span>
          </div>
        </div>
      </div>

      <div className="issue-panel">
        <div className="issue-header">
          <span className="provider-mark">GH</span>
          <span>Issue</span>
        </div>
        <h3>[Feedback] /contact - Bouton CTA peu visible</h3>
        <div className="labels">
          <span>source:client-feedback</span>
          <span>status:raw</span>
          <span>mode:pin</span>
        </div>
        <dl>
          <div>
            <dt>URL</dt>
            <dd>/contact</dd>
          </div>
          <div>
            <dt>Viewport</dt>
            <dd>390 x 844</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>pin + screenshot</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
