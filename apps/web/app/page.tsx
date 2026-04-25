import Link from "next/link";

const features = [
  {
    title: "Widget leger",
    body: "Un bouton fixed que tu ajoutes aux sites de staging avec une seule ligne de script."
  },
  {
    title: "Feedback contextualise",
    body: "Chaque retour embarque URL, viewport, navigateur, pin, screenshot et texte client."
  },
  {
    title: "GitHub-first",
    body: "Le flux naturel cree des GitHub Issues propres, labellisees et pretes a etre traitees."
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
          <Link className="link" href="/projects">Dashboard</Link>
          <a className="button" href="https://github.com/MLyte/ChangeThis">GitHub</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Client feedback to GitHub Issues</p>
          <h1>ChangeThis</h1>
          <p className="lede">
            Tes clients pointent ce qu&apos;il faut changer directement sur le site. Tu recois une issue GitHub propre,
            contextualisee, et prete a etre corrigee par toi ou par Codex.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/projects">Voir le dashboard</Link>
            <a className="button secondary-button" href="/api/widget/config?project=demo_project_key">Tester l&apos;API config</a>
          </div>
        </div>

        <div className="workflow" aria-label="ChangeThis feedback preview">
          <div className="browser-bar">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
          <div className="screen">
            <div className="mock-page">
              <div className="mock-line" />
              <div className="mock-line short" />
              <div className="mock-box" />
              <div className="mock-line" />
              <div className="mock-line short" />
            </div>
            <div className="pin">1</div>
            <div className="feedback-card">
              <strong>Changer ce bloc</strong>
              <p>Le client pose une pin, ajoute son texte, et ChangeThis prepare le ticket GitHub.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid">
          {features.map((feature) => (
            <article className="feature" key={feature.title}>
              <h2>{feature.title}</h2>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
