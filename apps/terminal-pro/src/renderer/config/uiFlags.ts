function readLocalFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

const viteDev = (() => {
  try {
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV)
  } catch {
    return false
  }
})()

export const uiFlags = {
  showAdvancedInspectors: viteDev || readLocalFlag('rina.devMode'),
  showTopLevelReceipts: false,
  showUnsafeMutationStarters: false,
}
