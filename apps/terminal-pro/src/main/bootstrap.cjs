;(async () => {
  try {
    await import('../../dist-electron/main.js')
  } catch (error) {
    console.error('[bootstrap] failed to load main:', error)
    process.exit(1)
  }
})()
