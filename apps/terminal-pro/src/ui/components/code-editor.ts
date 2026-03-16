import electron from 'electron'
const { ipcRenderer } = electron
import { diffLines } from 'diff'

interface CodeEditorContainers {
  filesContainer: HTMLElement
  preview: HTMLElement
  editor: HTMLTextAreaElement
}

// Store original content for diff comparison
let originalContent = ''
let isSideBySideMode = false

export function initCodeEditor(containers: CodeEditorContainers) {
  const { filesContainer, preview, editor } = containers

  filesContainer.innerHTML = ''
  preview.textContent = 'Select a file to preview.'
  editor.value = ''
  ;(editor as HTMLTextAreaElement).dataset.filePath = ''
  originalContent = ''

  // Live diff preview as user types
  editor.addEventListener('input', () => {
    if (isSideBySideMode) {
      renderSideBySideDiff(preview, editor)
    } else {
      renderPatchPreview(preview, editor)
    }
  })

  // Make functions available globally
  ;(window as any).refreshCodeWorkspace = async () => {
    const projectRoot = (document.getElementById('projectRoot') as HTMLInputElement)?.value || '.'
    await loadFiles(projectRoot)
  }
  ;(window as any).previewCodePatch = () => {
    // Toggle between inline and side-by-side diff
    isSideBySideMode = !isSideBySideMode
    if (isSideBySideMode) {
      renderSideBySideDiff(preview, editor)
    } else {
      renderPatchPreview(preview, editor)
    }
  }
  ;(window as any).applyCodePatch = () => {
    const filePath = (editor as HTMLTextAreaElement).dataset.filePath
    if (!filePath) {
      preview.textContent = 'No file selected'
      return
    }
    window.rina
      .invoke('agent:applyPatch', { path: filePath, content: editor.value })
      .then(() => {
        preview.textContent = `Patch applied to ${filePath}`
      })
      .catch((e: Error) => {
        preview.textContent = `Error: ${e.message}`
      })
  }
  ;(window as any).resetCodeDraft = () => {
    editor.value = ''
    ;(editor as HTMLTextAreaElement).dataset.filePath = ''
    originalContent = ''
    preview.textContent = 'Draft reset. Select a file to edit.'
  }
}

// Render color-coded diff preview
function renderPatchPreview(preview: HTMLElement, editor: HTMLTextAreaElement) {
  // Clear previous diff
  preview.innerHTML = ''

  const editedContent = editor.value
  const diffs = diffLines(originalContent, editedContent)

  diffs.forEach((part) => {
    const span = document.createElement('span')
    span.style.display = 'block'
    span.style.whiteSpace = 'pre-wrap'

    if (part.added) {
      span.className = 'diff-added'
      span.textContent = '+ ' + part.value
    } else if (part.removed) {
      span.className = 'diff-removed'
      span.textContent = '- ' + part.value
    } else {
      span.className = 'diff-context'
      span.textContent = '  ' + part.value
    }

    preview.appendChild(span)
  })

  if (!originalContent) {
    preview.textContent = editedContent || 'Select a file to preview.'
  }
}

// Render side-by-side diff preview
function renderSideBySideDiff(preview: HTMLElement, editor: HTMLTextAreaElement) {
  // Clear previous diff
  preview.innerHTML = ''

  const editedContent = editor.value
  const diffs = diffLines(originalContent, editedContent)

  // Build left (original) and right (edited) line arrays
  const leftLines: string[] = []
  const rightLines: string[] = []

  diffs.forEach((part) => {
    const lines = part.value.split('\n')
    // Remove last empty element from split
    if (lines[lines.length - 1] === '') lines.pop()

    lines.forEach((line) => {
      if (part.added) {
        leftLines.push('') // empty on left
        rightLines.push(line) // added on right
      } else if (part.removed) {
        leftLines.push(line) // removed on left
        rightLines.push('') // empty on right
      } else {
        leftLines.push(line)
        rightLines.push(line)
      }
    })
  })

  // Create side-by-side container
  const container = document.createElement('div')
  container.className = 'diff-side-by-side'

  // Header
  const header = document.createElement('div')
  header.className = 'diff-header'
  header.innerHTML = '<span>Original</span><span>Edited</span>'
  container.appendChild(header)

  // Render rows
  const maxLines = Math.max(leftLines.length, rightLines.length)
  for (let i = 0; i < maxLines; i++) {
    const row = document.createElement('div')
    row.className = 'diff-row'

    const leftLine = leftLines[i] || ''
    const rightLine = rightLines[i] || ''
    const isUnchanged = leftLine === rightLine

    const leftEl = document.createElement('div')
    leftEl.className = isUnchanged ? 'diff-line diff-context' : 'diff-line diff-removed'
    leftEl.textContent = leftLine

    const rightEl = document.createElement('div')
    rightEl.className = isUnchanged ? 'diff-line diff-context' : 'diff-line diff-added'
    rightEl.textContent = rightLine

    row.appendChild(leftEl)
    row.appendChild(rightEl)
    container.appendChild(row)
  }

  preview.appendChild(container)

  if (!originalContent) {
    preview.textContent = editedContent || 'Select a file to preview.'
  }
}

async function loadFiles(projectRoot: string) {
  const filesContainer = document.getElementById('codeFiles')
  const preview = document.getElementById('codePreview')
  const editor = document.getElementById('codeEditor') as HTMLTextAreaElement

  if (!filesContainer) return

  try {
    const response = await window.rina.codeListFiles({ projectRoot })
    const files = response.ok ? response.files || [] : []
    filesContainer.innerHTML = ''
    files.forEach((file: string) => {
      const div = document.createElement('div')
      div.textContent = file
      div.style.cursor = 'pointer'
      div.style.padding = '4px'
      div.onclick = async () => {
        try {
          const response = await window.rina.codeReadFile({ projectRoot: '.', relativePath: file })
          const content = response.ok ? response.content || '' : response.error || 'Error reading file'
          if (preview) {
            // Store original for diff
            originalContent = content
            preview.textContent = content
          }
          if (editor) {
            editor.value = content
            ;(editor as HTMLTextAreaElement).dataset.filePath = file
          }
        } catch (e) {
          if (preview) preview.textContent = `Error reading file: ${e}`
        }
      }
      filesContainer.appendChild(div)
    })
  } catch (e) {
    console.warn('Failed to load files:', e)
  }
}
