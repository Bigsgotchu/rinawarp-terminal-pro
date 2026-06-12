export const PHONE_TOOLKIT_TITLE =
  'RinaWarp Phone Toolkit | Professional Device Tools'

export const PHONE_TOOLKIT_DESCRIPTION =
  'RinaWarp Phone Toolkit provides guided phone diagnostics, device workflows, verified results, and professional customer support for Windows.'

export const PHONE_TOOLKIT_BODY_HTML = `
<main class="phone-toolkit-page">
  <section class="pt-hero" aria-labelledby="phone-toolkit-title">
    <div class="pt-hero-backdrop" aria-hidden="true"></div>
    <div class="pt-shell pt-hero-grid">
      <div class="pt-hero-copy">
        <p class="pt-eyebrow">RinaWarp Technologies</p>
        <h1 id="phone-toolkit-title">
          <span>RinaWarp</span>
          <strong>Phone Toolkit</strong>
        </h1>
        <p class="pt-lead">
          Professional phone tools with guided workflows, clear results,
          and customer-first safeguards.
        </p>
        <div class="pt-actions">
          <a
            class="pt-button pt-button-primary"
            href="#windows"
            data-analytics-event="phone_toolkit_windows_cta"
          >
            Get Phone Toolkit for Windows
          </a>
          <a
            class="pt-button pt-button-secondary"
            href="#capabilities"
          >
            Explore capabilities
          </a>
        </div>
        <div class="pt-availability" aria-label="Platform availability">
          <span class="pt-status pt-status-live">
            Windows available
          </span>
          <span class="pt-status">
            macOS coming after signing and notarization
          </span>
        </div>
      </div>
      <figure class="pt-hero-art">
        <img
          src="/assets/img/phone-toolkit/hero-brand-board.webp"
          alt="RinaWarp Phone Toolkit phoenix branding and product identity"
          width="1536"
          height="1024"
          fetchpriority="high"
        >
      </figure>
    </div>
  </section>

  <section class="pt-section" id="capabilities">
    <div class="pt-shell">
      <div class="pt-section-heading">
        <p class="pt-eyebrow">Tools. Clarity. Transformation.</p>
        <h2>Designed for confident device workflows</h2>
        <p>
          Follow focused steps, understand each result, and keep control
          throughout the process.
        </p>
      </div>
      <div class="pt-card-grid">
        <article class="pt-card">
          <span class="pt-card-number">01</span>
          <h3>Device detection</h3>
          <p>Identify connected devices and surface the information needed before beginning a supported workflow.</p>
        </article>
        <article class="pt-card">
          <span class="pt-card-number">02</span>
          <h3>Guided diagnostics</h3>
          <p>Present understandable checks and structured next steps instead of unexplained technical output.</p>
        </article>
        <article class="pt-card">
          <span class="pt-card-number">03</span>
          <h3>Verified results</h3>
          <p>Show clear completion, failure, and retry states so customers know what happened.</p>
        </article>
        <article class="pt-card">
          <span class="pt-card-number">04</span>
          <h3>Professional support</h3>
          <p>Provide version, device, and workflow information that helps support resolve issues quickly.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="pt-section pt-section-dark">
    <div class="pt-shell pt-split">
      <div>
        <p class="pt-eyebrow">Built with safeguards</p>
        <h2>Powerful tools should remain understandable</h2>
      </div>
      <ul class="pt-check-list">
        <li>Explicit workflow steps before sensitive actions</li>
        <li>Visible success and failure reporting</li>
        <li>Protected customer authentication</li>
        <li>Server-verified subscription access</li>
        <li>Published installer checksum verification</li>
      </ul>
    </div>
  </section>

  <section class="pt-section" id="windows">
    <div class="pt-shell">
      <div class="pt-download-panel">
        <div>
          <p class="pt-eyebrow">Windows release</p>
          <h2>Start with Phone Toolkit for Windows</h2>
          <p>
            The initial public release is available for Windows. The current
            installer may display an "Unknown publisher" warning until Windows
            code signing is added.
          </p>
        </div>
        <div class="pt-download-actions">
          <a
            class="pt-button pt-button-primary"
            href="mailto:support@rinawarptech.com?subject=Phone%20Toolkit%20Windows%20Access"
            data-analytics-event="phone_toolkit_download_click"
          >
            Request Windows access
          </a>
          <a
            class="pt-text-link"
            href="/phone-toolkit/checksums/"
          >
            Verify the installer checksum
          </a>
        </div>
      </div>
    </div>
  </section>

  <section class="pt-section pt-macos">
    <div class="pt-shell pt-split">
      <div>
        <p class="pt-eyebrow">macOS</p>
        <h2>Public macOS release coming later</h2>
      </div>
      <p>
        Private macOS QA is underway. The public macOS release will become
        available after Developer ID signing and Apple notarization are
        configured. Unsigned internal QA builds are not distributed publicly.
      </p>
    </div>
  </section>

  <section class="pt-section" id="faq">
    <div class="pt-shell">
      <div class="pt-section-heading">
        <p class="pt-eyebrow">Questions</p>
        <h2>Phone Toolkit FAQ</h2>
      </div>
      <div class="pt-faq">
        <details>
          <summary>Which operating systems are supported?</summary>
          <p>
            Windows is the initial public platform. macOS remains private
            until signing and notarization are complete.
          </p>
        </details>
        <details>
          <summary>Why might Windows show an Unknown publisher warning?</summary>
          <p>
            The initial Windows installer is not yet code signed. Customers
            should download it only from rinawarptech.com and verify its
            published SHA-256 checksum.
          </p>
        </details>
        <details>
          <summary>Is the private macOS QA build available?</summary>
          <p>
            No. It is an internal development and quality-assurance artifact
            used only by the product owner.
          </p>
        </details>
        <details>
          <summary>Where can I get support?</summary>
          <p>
            Contact
            <a href="mailto:support@rinawarptech.com">
              support@rinawarptech.com
            </a>.
          </p>
        </details>
      </div>
    </div>
  </section>

  <section class="pt-final-cta">
    <div class="pt-shell">
      <p class="pt-eyebrow">RinaWarp Phone Toolkit</p>
      <h2>Tools. Clarity. Transformation. In your hands.</h2>
      <a class="pt-button pt-button-primary" href="#windows">
        View Windows availability
      </a>
    </div>
  </section>
</main>
`