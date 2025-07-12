import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/404.module.css';

export default function Custom404() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Trigger splash animation after page load
    const timer = setTimeout(() => setShowSplash(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Head>
        <title>404 - Lost at Sea | RinaWarp</title>
        <meta
          name="description"
          content="Rina couldn't find that page—it may have sunk beneath the waves."
        />
      </Head>

      <div className={styles.container}>
        <div className={styles.ocean}>
          {/* Floating bubbles */}
          <div className={styles.bubbles}>
            <div className={styles.bubble}></div>
            <div className={styles.bubble}></div>
            <div className={styles.bubble}></div>
            <div className={styles.bubble}></div>
            <div className={styles.bubble}></div>
          </div>

          <div className={styles.content}>
            <div className={styles.mermaid}>🧜‍♀️</div>

            <h1 className={styles.title}>
              <span className={styles.code}>404</span>
              <span className={styles.subtitle}>Lost at Sea</span>
            </h1>

            <p className={styles.message}>
              Rina couldn't find that page—it may have sunk beneath the waves.
            </p>

            <div className={styles.actions}>
              <Link href="/" className={styles.homeButton}>
                🏠 Swim Back to Shore
              </Link>

              <Link href="/api/download" className={styles.downloadButton}>
                🐚 Try Download Instead
              </Link>
            </div>

            <div className={styles.suggestions}>
              <h3>🔍 Maybe you were looking for:</h3>
              <ul>
                <li>
                  <Link href="/">🏡 Homepage</Link>
                </li>
                <li>
                  <Link href="/api/download">📦 Download RinaWarp</Link>
                </li>
                <li>
                  <Link href="/docs">📖 Documentation</Link>
                </li>
                <li>
                  <Link href="/about">🧜‍♀️ About Rina</Link>
                </li>
              </ul>
            </div>
          </div>

          {showSplash && (
            <div className={styles.splash}>
              <div className={styles.wave}>🌊</div>
              <div className={styles.wave}>🌊</div>
              <div className={styles.wave}>🌊</div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <p>
            💡 <strong>Tip:</strong> If you're trying to download RinaWarp and got here by accident,
            try the <Link href="/api/download">direct download link</Link> instead!
          </p>
        </div>
      </div>
    </>
  );
}
