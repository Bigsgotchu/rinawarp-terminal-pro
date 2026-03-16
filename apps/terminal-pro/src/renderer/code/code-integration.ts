export {}

// Safely get ipcRenderer from preload
const { ipcRenderer } = window.electronAPI ?? {}

document.addEventListener('DOMContentLoaded', () => {
  const fileList = document.getElementById('fileList') as HTMLInputElement | null
  const codePreview = document.getElementById('codePreview')
  const codeEditor = document.getElementById('codeEditor') as HTMLTextAreaElement | null
  const saveBtn = document.getElementById('saveBtn')
  const filePathInput = document.getElementById('filePath') as HTMLInputElement | null

  if (!fileList || !codePreview || !codeEditor || !saveBtn || !filePathInput) {
    console.warn('Code integration DOM elements not found, skipping initialization')
    return
  }

  // --- Load file on selection ---
  fileList.addEventListener('change', async (e) => {
    const target = e.target as HTMLInputElement | null
    const file = target?.files?.[0]
    if (!file) return

    try {
      // Ask main process to read file contents via IPC
      // Note: file.path is only available in Electron with webPreferences.nodeIntegration: false
      // and requires the file to be selected from a dialog or drag-and-drop
      const filePath = (file as any).path || file.name

      if (ipcRenderer) {
        const content: string = await ipcRenderer.invoke('read-file', filePath)
        codeEditor.value = content
        codePreview.textContent = content.slice(0, 200) + (content.length > 200 ? '...' : '')
        filePathInput.value = filePath
      } else {
        // Fallback for development/testing without Electron
        // Read file content using FileReader API (sandboxed)
        const reader = new FileReader()
        reader.onload = (event) => {
          const content = event.target?.result as string
          codeEditor.value = content
          codePreview.textContent = content.slice(0, 200) + (content.length > 200 ? '...' : '')
          filePathInput.value = file.name
        }
        reader.onerror = () => {
          console.error('Failed to read file:', reader.error)
        }
        reader.readAsText(file)
      }
    } catch (err) {
      console.error('Failed to read file:', err)
    }
  })

  // --- Save file on button click ---
  saveBtn.addEventListener('click', async () => {
    const filePath = filePathInput.value
    if (!filePath) {
      console.warn('No file path specified')
      return
    }

    try {
      if (ipcRenderer) {
        // Use Electron IPC to save file via main process
        await ipcRenderer.invoke('save-file', filePath, codeEditor.value)
        console.log('File saved to:', filePath)
      } else {
        // Fallback: create download in browser environment
        const blob = new Blob([codeEditor.value], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filePath.split('/').pop() || filePath.split('\\').pop() || 'file.txt'
        a.click()
        URL.revokeObjectURL(url)
        console.log('File downloaded:', filePath)
      }
    } catch (err) {
      console.error('Failed to save file:', err)
    }
  })
})

// Signal renderer ready
window.RINAWARP_READY = true
