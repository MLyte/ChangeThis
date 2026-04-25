import Link from "next/link";

const feedbacks = [
  {
    message: "Le bouton de contact manque de contraste sur mobile.",
    page: "/contact",
    mode: "pin",
    status: "status:raw"
  },
  {
    message: "Remplacer le titre de la section services.",
    page: "/",
    mode: "comment",
    status: "status:raw"
  },
  {
    message: "La capture montre un espacement trop grand avant le footer.",
    page: "/about",
    mode: "screenshot",
    status: "sent_to_github"
  }
];

export default function ProjectsPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark">CT</span>
          ChangeThis
        </Link>
        <nav className="nav" aria-label="Project navigation">
          <code>demo_project_key</code>
        </nav>
      </header>

      <section className="dashboard">
        <p className="eyebrow">MVP dashboard</p>
        <h1>Inbox feedback</h1>
        <p className="lede">
          Premiere vue produit pour verifier le flux : retours recus, mode utilise, page concernee, et statut GitHub.
        </p>

        <div className="table">
          <div className="row header">
            <span>Feedback</span>
            <span>Page</span>
            <span>Mode</span>
            <span>Statut</span>
          </div>
          {feedbacks.map((feedback) => (
            <div className="row" key={`${feedback.page}-${feedback.message}`}>
              <span>{feedback.message}</span>
              <span>{feedback.page}</span>
              <span>{feedback.mode}</span>
              <span>{feedback.status}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
