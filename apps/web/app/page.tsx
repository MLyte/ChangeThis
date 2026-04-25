import Link from "next/link";

const benefits = [
  {
    title: "Fini les retours disperses",
    body: "Plus de captures envoyees par mail, WhatsApp ou PDF sans URL ni contexte."
  },
  {
    title: "Pense pour GitHub",
    body: "Chaque retour devient une issue tracable, labelisee et actionnable dans ton repo."
  },
  {
    title: "Simple pour le client",
    body: "Pas de compte, pas de jargon, juste un bouton sur le site de staging."
  },
  {
    title: "Pret pour l'IA",
    body: "Les feedbacks sont structures pour etre tries, resumes ou corriges plus tard par Codex."
  }
];

const workflow = [
  {
    step: "01",
    title: "Le client clique",
    body: "Il ouvre le widget sur le site de staging, ajoute une note, une pin ou une capture."
  },
  {
    step: "02",
    title: "ChangeThis capture le contexte",
    body: "URL, viewport, navigateur, position, element cible et screenshot sont ajoutes automatiquement."
  },
  {
    step: "03",
    title: "GitHub recoit une issue propre",
    body: "Le retour arrive avec labels, metadonnees et une structure lisible par toi comme par l'IA."
  }
];

const plans = [
  {
    name: "Free",
    audience: "Pour tester sur un projet",
    items: ["1 projet actif", "30 feedbacks par mois", "GitHub Issues"]
  },
  {
    name: "Solo",
    audience: "Pour freelances",
    items: ["Projets multiples", "Captures et pins", "Branding optionnel"]
  },
  {
    name: "Studio",
    audience: "Pour petites agences",
    items: ["Equipes et clients", "Regles GitHub", "Triage IA"]
  }
];

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
          <a className="link" href="#pricing">Pricing</a>
          <a className="link hide-mobile" href="https://github.com/MLyte/ChangeThis">GitHub</a>
          <a className="button" href="mailto:hello@changethis.dev?subject=ChangeThis%20beta">Join waitlist</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Client feedback to GitHub Issues</p>
          <h1>ChangeThis</h1>
          <p className="hero-statement">
            Vos clients pointent ce qu&apos;il faut changer. Vous recevez des GitHub Issues propres.
          </p>
          <p className="lede">
            Ajoutez un widget de feedback a vos sites de staging. Notes, pins et captures deviennent des issues
            contextualisees, pretes a trier, corriger ou confier a l&apos;IA.
          </p>
          <div className="hero-actions">
            <a className="button" href="mailto:hello@changethis.dev?subject=ChangeThis%20beta">Demander un acces</a>
            <a className="button secondary-button" href="#workflow">Voir le workflow</a>
          </div>
          <p className="microcopy">Pense pour freelances, petites agences et studios web.</p>
        </div>

        <ProductScene />
      </section>

      <section className="workflow-band" id="workflow">
        <div className="section-heading">
          <p className="eyebrow">Workflow</p>
          <h2>Du change this a l&apos;issue exploitable</h2>
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
          <h2>Moins d&apos;allers-retours. Plus de corrections utiles.</h2>
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
          <p className="eyebrow">Installation</p>
          <h2>Une ligne de script. Un workflow propre.</h2>
          <p className="lede">
            Collez le widget sur votre environnement de staging, connectez un repo GitHub, puis laissez vos clients
            commenter directement sur le site.
          </p>
          <ul className="check-list">
            <li>Domaines autorises</li>
            <li>Screenshots masques</li>
            <li>Labels GitHub automatiques</li>
            <li>Aucun token GitHub cote navigateur</li>
          </ul>
        </div>
        <pre className="code-block"><code>{`<script
  src="https://app.changethis.dev/widget.js"
  data-project="project_public_key">
</script>`}</code></pre>
      </section>

      <section className="section pricing" id="pricing">
        <div className="section-heading compact">
          <p className="eyebrow">Open-core</p>
          <h2>Sans pub, pense pour durer</h2>
          <p>
            Le widget ChangeThis sera open source. Le SaaS heberge ajoutera la gestion des projets, GitHub App managee,
            stockage des captures, historique, equipes et triage IA.
          </p>
        </div>
        <div className="plans">
          {plans.map((plan) => (
            <article className="plan" key={plan.name}>
              <h3>{plan.name}</h3>
              <p>{plan.audience}</p>
              <ul>
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="pricing-note">Les prix arrivent avec la beta.</p>
      </section>

      <section className="final-cta">
        <div>
          <p className="eyebrow">En construction</p>
          <h2>Transformez les retours clients en corrections claires.</h2>
          <p>
            ChangeThis est en construction. Rejoignez les premiers utilisateurs et testez le widget sur vos prochains
            sites de staging.
          </p>
        </div>
        <div className="hero-actions">
          <a className="button light-button" href="mailto:hello@changethis.dev?subject=ChangeThis%20beta">Rejoindre la beta</a>
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
          <button className="feedback-pill">Feedback</button>
          <span className="pin">1</span>
          <div className="client-note">
            <strong>Le bouton n&apos;est pas assez visible sur mobile</strong>
            <span>Pin sur .hero-cta</span>
          </div>
        </div>
      </div>

      <div className="issue-panel">
        <div className="issue-header">
          <span className="github-mark">GH</span>
          <span>GitHub Issue</span>
        </div>
        <h3>[Feedback] /contact - Bouton CTA peu visible</h3>
        <div className="labels">
          <span>source:client-feedback</span>
          <span>status:raw</span>
          <span>type:design</span>
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
