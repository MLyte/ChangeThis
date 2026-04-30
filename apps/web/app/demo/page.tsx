import { demoProject } from "../../lib/demo-project";
import { AppHeader } from "../app-header";
import { T } from "../i18n";

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
        <div className="demo-copy">
          <p className="eyebrow"><T k="demo.eyebrow" /></p>
          <h1><T k="demo.title" /></h1>
          <p className="hero-statement">
            <T k="demo.statement" />
          </p>
          <p className="lede">
            <T k="demo.lede" />
          </p>
          <code className="demo-project-key">{demoProject.publicKey}</code>
        </div>

        <div className="demo-layout">
          <section className="demo-content">
            <span className="status-badge needs_setup"><T k="demo.badge" /></span>
            <h2><T k="demo.content.title" /></h2>
            <p>
              <T k="demo.content.copy" />
            </p>
            <div className="demo-actions">
              <button><T k="demo.cta.primary" /></button>
              <button className="quiet"><T k="demo.cta.secondary" /></button>
            </div>
          </section>

          <aside className="demo-sidebar">
            <h3><T k="demo.scenarios.title" /></h3>
            <ul className="check-list">
              <li><T k="demo.scenarios.1" /></li>
              <li><T k="demo.scenarios.2" /></li>
              <li><T k="demo.scenarios.3" /></li>
            </ul>
            <label>
              <T k="demo.email" />
              <input type="email" defaultValue="client@example.com" />
            </label>
            <label>
              <T k="demo.privateComment" />
              <textarea />
            </label>
          </aside>
        </div>
      </section>

      <script
        src="/widget.global.js"
        data-project={demoProject.publicKey}
        data-endpoint="/api/public/feedback"
        async
      />
    </main>
  );
}
