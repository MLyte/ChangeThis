"use client";

import Link from "next/link";
import { useState } from "react";

type Language = "fr" | "en";

const translations = {
  fr: {
    nav: {
      workflow: "Workflow",
      projects: "Projects",
      demo: "Demo",
      github: "GitHub",
      cta: "Join waitlist"
    },
    hero: {
      eyebrow: "Client feedback to issues",
      statement: "Le widget qui transforme un \"change this\" en issue exploitable.",
      lede: "ChangeThis collecte notes, pins et captures sur vos sites de staging, valide l'origine du projet, prépare un brouillon d'issue propre et vous aide à le router vers le bon repository.",
      configure: "Configurer les projets",
      showWorkflow: "Voir le workflow",
      microcopy: "Open source, multi-projets, prêt pour les intégrations provider."
    },
    workflowHeading: "Du commentaire client au brouillon d'issue contextualisé",
    whyEyebrow: "Pourquoi",
    whyHeading: "Le feedback devient une donnée produit, pas une conversation perdue.",
    install: {
      eyebrow: "État du produit",
      heading: "Le socle est en place pour relier sites clients et repositories.",
      lede: "Le MVP ne se limite plus à une démo locale. Il expose un bundle widget versionné, une API publique de feedback, un modèle de projets autorisés et un dashboard de préparation des destinations d'issues.",
      checklist: [
        "Bundle servi via /widget.js et /widget.global.js",
        "Projets publics avec domaines autorisés",
        "Brouillons provider-neutral pour GitHub ou GitLab",
        "Configuration de production documentée"
      ]
    },
    mirrors: {
      eyebrow: "Miroirs pilotes",
      heading: "Un seul outil pour plusieurs sites et plusieurs repos.",
      body: "ChangeThis sert de couche de feedback pour des pages vitrines, des produits open source et des sites clients. Chaque projet garde son origine autorisée, son libellé et sa destination d'issue.",
      card: "Clé publique, origine autorisée et repository cible configurables dans ChangeThis."
    },
    final: {
      eyebrow: "En construction",
      heading: "Le feedback client peut maintenant entrer dans votre chaîne de livraison.",
      body: "La prochaine étape consiste à finaliser les credentials provider, persister les retours et automatiser la création d'issues depuis les brouillons validés.",
      dashboard: "Ouvrir le dashboard",
      follow: "Suivre sur GitHub"
    },
    benefits: [
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
    ],
    workflow: [
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
    ]
  },
  en: {
    nav: {
      workflow: "Workflow",
      projects: "Projects",
      demo: "Demo",
      github: "GitHub",
      cta: "Join waitlist"
    },
    hero: {
      eyebrow: "Client feedback to issues",
      statement: "The widget that turns a \"change this\" into an actionable issue.",
      lede: "ChangeThis captures notes, pins, and screenshots on your staging sites, validates project origin, prepares a clean issue draft, and helps route it to the right repository.",
      configure: "Configure projects",
      showWorkflow: "View workflow",
      microcopy: "Open source, multi-project, ready for provider integrations."
    },
    workflowHeading: "From client comment to contextualized issue draft",
    whyEyebrow: "Why",
    whyHeading: "Feedback becomes product data, not a lost conversation.",
    install: {
      eyebrow: "Product status",
      heading: "The foundation is ready to connect client sites and repositories.",
      lede: "The MVP is now more than a local demo. It ships a versioned widget bundle, a public feedback API, an allowed-project model, and a dashboard to prepare issue destinations.",
      checklist: [
        "Bundle served through /widget.js and /widget.global.js",
        "Public projects with allowed domains",
        "Provider-neutral drafts for GitHub or GitLab",
        "Documented production configuration"
      ]
    },
    mirrors: {
      eyebrow: "Pilot mirrors",
      heading: "One tool for multiple sites and repositories.",
      body: "ChangeThis acts as a feedback layer for showcase pages, open-source products, and client websites. Each project keeps its own allowed origin, label, and issue destination.",
      card: "Public key, allowed origin, and target repository can be configured in ChangeThis."
    },
    final: {
      eyebrow: "In progress",
      heading: "Client feedback can now enter your delivery pipeline.",
      body: "Next step: finalize provider credentials, persist feedback, and automate issue creation from validated drafts.",
      dashboard: "Open dashboard",
      follow: "Follow on GitHub"
    },
    benefits: [
      {
        title: "One report = full context",
        body: "URL, path, title, browser, viewport, language, pin, and screenshot are grouped in a single payload."
      },
      {
        title: "Separated projects",
        body: "Each website uses its own public key, allowed domains, and dedicated issue destination."
      },
      {
        title: "Ready for GitHub and GitLab",
        body: "The dashboard prepares provider integrations and namespace, repository, and public URL mapping."
      },
      {
        title: "AI-friendly",
        body: "Issues are structured to be triaged, summarized, and transformed into fixes by Codex."
      }
    ],
    workflow: [
      {
        step: "01",
        title: "Install the widget",
        body: "Load /widget.js on a client site, add the public project key, and choose the feedback button label."
      },
      {
        step: "02",
        title: "Point at the problem",
        body: "The client leaves a note, pins an element, or attaches a screenshot without creating an account or leaving the page."
      },
      {
        step: "03",
        title: "Route to the right repo",
        body: "ChangeThis validates origin, builds an issue draft, and links it to the configured project."
      }
    ]
  }
} as const;

const supportedProjects = ["ChangeThis", "OptiMaster", "Andenne Bears", "Yoda Carrosserie"];

export default function HomePage() {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") {
      return "fr";
    }

    const storedLanguage = window.localStorage.getItem("changethis-language");
    return storedLanguage === "fr" || storedLanguage === "en" ? storedLanguage : "fr";
  });

  const t = translations[language];

  const setSiteLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    window.localStorage.setItem("changethis-language", nextLanguage);
  };

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">CT</span>
          ChangeThis
        </Link>
        <nav className="nav" aria-label="Main navigation">
          <a className="link" href="#workflow">{t.nav.workflow}</a>
          <Link className="link" href="/projects">{t.nav.projects}</Link>
          <a className="link" href="/demo">{t.nav.demo}</a>
          <a className="link hide-mobile" href="https://github.com/MLyte/ChangeThis">{t.nav.github}</a>
          <button
            aria-label="Toggle language"
            className="link lang-toggle"
            onClick={() => setSiteLanguage(language === "fr" ? "en" : "fr")}
            type="button"
          >
            {language === "fr" ? "FR / EN" : "EN / FR"}
          </button>
          <a className="button" href="mailto:hello@changethis.dev?subject=ChangeThis%20beta">{t.nav.cta}</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{t.hero.eyebrow}</p>
          <h1>ChangeThis</h1>
          <p className="hero-statement">{t.hero.statement}</p>
          <p className="lede">{t.hero.lede}</p>
          <div className="hero-actions">
            <Link className="button" href="/projects">{t.hero.configure}</Link>
            <a className="button secondary-button" href="#workflow">{t.hero.showWorkflow}</a>
          </div>
          <p className="microcopy">{t.hero.microcopy}</p>
        </div>

        <ProductScene />
      </section>

      <section className="workflow-band" id="workflow">
        <div className="section-heading">
          <p className="eyebrow">Workflow</p>
          <h2>{t.workflowHeading}</h2>
        </div>
        <div className="steps">
          {t.workflow.map((item) => (
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
          <p className="eyebrow">{t.whyEyebrow}</p>
          <h2>{t.whyHeading}</h2>
        </div>
        <div className="benefit-grid">
          {t.benefits.map((benefit) => (
            <article className="benefit" key={benefit.title}>
              <h3>{benefit.title}</h3>
              <p>{benefit.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="install-section">
        <div>
          <p className="eyebrow">{t.install.eyebrow}</p>
          <h2>{t.install.heading}</h2>
          <p className="lede">{t.install.lede}</p>
          <ul className="check-list">
            {t.install.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
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
          <p className="eyebrow">{t.mirrors.eyebrow}</p>
          <h2>{t.mirrors.heading}</h2>
          <p>{t.mirrors.body}</p>
        </div>
        <div className="benefit-grid">
          {supportedProjects.map((project) => (
            <article className="benefit" key={project}>
              <h3>{project}</h3>
              <p>{t.mirrors.card}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <div>
          <p className="eyebrow">{t.final.eyebrow}</p>
          <h2>{t.final.heading}</h2>
          <p>{t.final.body}</p>
        </div>
        <div className="hero-actions">
          <Link className="button light-button" href="/projects">{t.final.dashboard}</Link>
          <a className="button dark-outline" href="https://github.com/MLyte/ChangeThis">{t.final.follow}</a>
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
