import { useState } from 'react';
import styles from './DownloadButton.module.css';

export default function DownloadButton({ fileName = 'rinawarp.zip' }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState('');

  const handleDownload = async () => {
    setIsDownloading(true);
    setMessage('🌊 Rina is fetching the bundle from the digital depths...');

    try {
      const response = await fetch(`/api/download?file=${fileName}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Download failed');
      }

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      setMessage('🐠 RinaWarp is docked and ready to explore!');

      // Clear success message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Download error:', err);
      setMessage("🧜‍♀️ Uh-oh! Rina might've misplaced the bundle in a whirlpool. Try again soon!");

      // Clear error message after 5 seconds
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={styles.downloadContainer}>
      <button className={styles.downloadBtn} onClick={handleDownload} disabled={isDownloading}>
        🐚 Download Rinawarp Bundle
      </button>

      {isDownloading && <div className={styles.spinner}>🧜‍♀️</div>}

      {message && <div className={styles.messageBox}>{message}</div>}
    </div>
  );
}
