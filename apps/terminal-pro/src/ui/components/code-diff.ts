// Code Diff Component - Live diff between original and edited content
// Supports inline and side-by-side modes

interface DiffLine {
  type: 'context' | 'added' | 'removed'
  content: string
  lineNumber: number
}

let isSideBySideMode = false

export function toggleDiffMode() {
  isSideBySideMode = !isSideBySideMode
}

export function getDiffMode(): boolean {
  return isSideBySideMode
}

export function renderDiff(original: string, edited: string) {
  const container = document.getElementById('codeDiff')
  if (!container) return

  container.innerHTML = ''

  if (isSideBySideMode) {
    renderSideBySideDiff(container, original, edited)
  } else {
    renderInlineDiff(container, original, edited)
  }
}

function renderInlineDiff(container: HTMLElement, original: string, edited: string) {
  const diffRows = computeDiff(original, edited)

  diffRows.forEach((row) => {
    const lineEl = document.createElement('div')
    lineEl.classList.add('diff-line', row.type)

    // Add prefix for visibility
    const prefix = row.type === 'added' ? '+ ' : row.type === 'removed' ? '- ' : '  '
    lineEl.textContent = prefix + row.content

    container.appendChild(lineEl)
  })
}

function renderSideBySideDiff(container: HTMLElement, original: string, edited: string) {
  const diffRows = computeDiff(original, edited)

  const wrapper = document.createElement('div')
  wrapper.classList.add('diff-side-by-side')

  // Header
  const header = document.createElement('div')
  header.classList.add('diff-header')
  header.innerHTML = '<span>Original</span><span>Edited</span>'
  wrapper.appendChild(header)

  // Rows
  diffRows.forEach((row) => {
    const rowEl = document.createElement('div')
    rowEl.classList.add('diff-row')

    const left = document.createElement('div')
    const right = document.createElement('div')
    left.classList.add('diff-line')
    right.classList.add('diff-line')

    if (row.type === 'removed') {
      left.classList.add('removed')
      left.textContent = row.content
    } else if (row.type === 'added') {
      right.classList.add('added')
      right.textContent = row.content
    } else {
      left.classList.add('context')
      right.classList.add('context')
      left.textContent = row.content
      right.textContent = row.content
    }

    rowEl.appendChild(left)
    rowEl.appendChild(right)
    wrapper.appendChild(rowEl)
  })

  container.appendChild(wrapper)
}

// Simple line-by-line diff algorithm
function computeDiff(a: string, b: string): DiffLine[] {
  const aLines = a.split('\n')
  const bLines = b.split('\n')
  const maxLen = Math.max(aLines.length, bLines.length)
  const result: DiffLine[] = []

  for (let i = 0; i < maxLen; i++) {
    const aLine = aLines[i] ?? ''
    const bLine = bLines[i] ?? ''

    if (aLine === bLine) {
      result.push({ type: 'context', content: aLine, lineNumber: i + 1 })
    } else {
      if (aLine) result.push({ type: 'removed', content: aLine, lineNumber: i + 1 })
      if (bLine) result.push({ type: 'added', content: bLine, lineNumber: i + 1 })
    }
  }

  return result
}

// Apply patch via agent API
export async function applyPatch(filePath: string, content: string): Promise<boolean> {
  try {
    await window.rina.invoke('agent:applyPatch', { filePath, content })
    return true
  } catch (e) {
    console.error('Failed to apply patch:', e)
    return false
  }
}

// Export computeDiff for external use
export { computeDiff }
