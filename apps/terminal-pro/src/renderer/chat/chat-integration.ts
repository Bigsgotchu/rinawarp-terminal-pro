export {}

const { ipcRenderer } = (window as any).electronAPI

document.addEventListener('DOMContentLoaded', () => {
  const chatThread = document.getElementById('chatThread')
  const chatInput = document.getElementById('chatInput') as HTMLTextAreaElement | null
  const chatSendBtn = document.getElementById('chatSendBtn')

  if (!chatThread || !chatInput || !chatSendBtn) {
    console.warn('Chat UI missing')
    return
  }

  function scrollBottom() {
    if (chatThread) {
      chatThread.scrollTop = chatThread.scrollHeight
    }
  }

  function message(role: 'You' | 'Agent', text: string, isStreaming = false) {
    if (!chatThread) return null
    
    const el = document.createElement('div')
    el.className = `chat-msg ${role.toLowerCase()}`
    
    const label = document.createElement('span')
    label.className = 'chat-label'
    label.textContent = `${role}: `
    
    const content = document.createElement('span')
    content.className = 'chat-content'
    content.textContent = text
    
    el.appendChild(label)
    el.appendChild(content)
    chatThread.appendChild(el)
    scrollBottom()
    
    return content
  }

  // Inline code diff block for file changes
  function diffBlock(filePath: string, original: string, edited: string) {
    if (!chatThread) return null
    
    const wrapper = document.createElement('div')
    wrapper.className = 'diff-block'

    const header = document.createElement('div')
    header.className = 'diff-header'
    header.innerHTML = `
      <span class="diff-file-path">${filePath}</span>
      <span class="diff-mode">Inline</span>
    `
    
    const content = document.createElement('div')
    content.className = 'diff-content'
    
    // Compute diff
    const diffRows = computeDiff(original, edited)
    
    diffRows.forEach((row) => {
      const lineEl = document.createElement('div')
      lineEl.className = `diff-line diff-${row.type}`
      
      const prefix = row.type === 'added' ? '+ ' : row.type === 'removed' ? '- ' : '  '
      lineEl.textContent = prefix + row.content
      
      content.appendChild(lineEl)
    })

    const actions = document.createElement('div')
    actions.className = 'diff-actions'
    
    const applyBtn = document.createElement('button')
    applyBtn.className = 'diff-apply-btn'
    applyBtn.innerHTML = '✓ Apply Changes'
    
    const discardBtn = document.createElement('button')
    discardBtn.className = 'diff-discard-btn'
    discardBtn.innerHTML = '✕ Discard'
    
    // Apply patch handler
    applyBtn.onclick = async () => {
      applyBtn.disabled = true
      applyBtn.innerHTML = '⏳ Applying...'
      
      try {
        const result = await ipcRenderer.invoke('agent:applyPatch', { 
          filePath, 
          content: edited 
        })
        
        if (result.ok) {
          applyBtn.innerHTML = '✓ Applied!'
          applyBtn.classList.add('success')
        } else {
          applyBtn.innerHTML = '✕ Failed'
          applyBtn.classList.add('error')
        }
      } catch (err) {
        applyBtn.innerHTML = '✕ Error'
        applyBtn.classList.add('error')
      }
    }
    
    discardBtn.onclick = () => {
      wrapper.remove()
    }

    actions.appendChild(applyBtn)
    actions.appendChild(discardBtn)
    
    wrapper.appendChild(header)
    wrapper.appendChild(content)
    wrapper.appendChild(actions)
    
    chatThread.appendChild(wrapper)
    scrollBottom()
    
    return wrapper
  }

  // Simple line-by-line diff algorithm
  function computeDiff(a: string, b: string): Array<{type: 'context' | 'added' | 'removed', content: string}> {
    const aLines = a.split('\n')
    const bLines = b.split('\n')
    const maxLen = Math.max(aLines.length, bLines.length)
    const result: Array<{type: 'context' | 'added' | 'removed', content: string}> = []

    for (let i = 0; i < maxLen; i++) {
      const aLine = aLines[i] ?? ''
      const bLine = bLines[i] ?? ''

      if (aLine === bLine) {
        result.push({ type: 'context', content: aLine })
      } else {
        if (aLine) result.push({ type: 'removed', content: aLine })
        if (bLine) result.push({ type: 'added', content: bLine })
      }
    }

    return result
  }

  function cliBlock(command: string) {
    if (!chatThread) return null
    
    const wrapper = document.createElement('div')
    wrapper.className = 'cli-block'

    const header = document.createElement('div')
    header.className = 'cli-header'
    header.innerHTML = '<span class="cli-title">Terminal Command</span>'
    
    const actions = document.createElement('div')
    actions.className = 'cli-actions'

    const input = document.createElement('textarea')
    input.className = 'cli-input'
    input.value = command
    input.rows = Math.min(command.split('\n').length, 5)

    const output = document.createElement('pre')
    output.className = 'cli-output'
    output.style.display = 'none'

    const runBtn = document.createElement('button')
    runBtn.className = 'cli-run-btn'
    runBtn.innerHTML = '▶ Run'
    
    const copyBtn = document.createElement('button')
    copyBtn.className = 'cli-copy-btn'
    copyBtn.innerHTML = '⎘ Copy'

    const clearBtn = document.createElement('button')
    clearBtn.className = 'cli-clear-btn'
    clearBtn.innerHTML = '✕ Clear'

    // Run button handler
    runBtn.onclick = async () => {
      runBtn.disabled = true
      runBtn.innerHTML = '⏳ Running...'
      output.style.display = 'block'
      output.textContent = 'Executing command...'
      output.className = 'cli-output cli-running'

      try {
        const result = await ipcRenderer.invoke('terminal:run', input.value)
        output.className = 'cli-output'
        if (result.error) {
          output.textContent = result.error
          output.classList.add('cli-error')
        } else {
          output.textContent = result.output || '(no output)'
        }
      } catch (err) {
        output.className = 'cli-output cli-error'
        output.textContent = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
      } finally {
        runBtn.disabled = false
        runBtn.innerHTML = '▶ Run'
      }
    }

    // Copy button handler
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(input.value)
        copyBtn.innerHTML = '✓ Copied!'
        setTimeout(() => {
          copyBtn.innerHTML = '⎘ Copy'
        }, 2000)
      } catch (err) {
        copyBtn.innerHTML = '✕ Failed'
        setTimeout(() => {
          copyBtn.innerHTML = '⎘ Copy'
        }, 2000)
      }
    }

    // Clear button handler
    clearBtn.onclick = () => {
      output.style.display = 'none'
      output.textContent = ''
    }

    actions.appendChild(runBtn)
    actions.appendChild(copyBtn)
    actions.appendChild(clearBtn)
    
    header.appendChild(actions)
    wrapper.appendChild(header)
    wrapper.appendChild(input)
    wrapper.appendChild(output)

    chatThread.appendChild(wrapper)
    scrollBottom()
    
    return wrapper
  }

  function createTypingIndicator() {
    if (!chatThread) return null
    
    const typing = document.createElement('div')
    typing.className = 'typing'
    typing.innerHTML = `
      <span class="typing-text">Agent thinking</span>
      <span class="typing-dots">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </span>
    `
    chatThread.appendChild(typing)
    scrollBottom()
    return typing
  }

  // Enhanced streaming message with character-by-character animation
  async function streamMessage(text: string, onComplete?: () => void) {
    const content = message('Agent', '')
    const typing = createTypingIndicator()
    
    // Remove typing indicator
    if (typing && typing.parentNode) {
      typing.parentNode.removeChild(typing)
    }
    
    // Character-by-character streaming effect
    let currentIndex = 0
    const chars = text.split('')
    const speed = 15 // ms per character
    
    return new Promise<void>((resolve) => {
      function typeNextChar() {
        if (currentIndex < chars.length && content) {
          content.textContent += chars[currentIndex]
          currentIndex++
          scrollBottom()
          setTimeout(typeNextChar, speed)
        } else {
          if (onComplete) onComplete()
          resolve()
        }
      }
      typeNextChar()
    })
  }

  // Process agent response - handle different content types
  function processResponse(response: any) {
    // Handle streaming response
    if (response.streaming) {
      return streamMessage(response.text || '', () => processResponseContent(response))
    }
    
    // Regular response
    message('Agent', response.text || '')
    processResponseContent(response)
  }
  
  // Process response content (CLI blocks, diffs, etc.)
  function processResponseContent(response: any) {
    // Add CLI blocks for commands
    if (response.commands) {
      response.commands.forEach((cmd: string) => cliBlock(cmd))
    }
    
    // Add diff blocks for file changes
    if (response.diffs) {
      response.diffs.forEach((diff: { filePath: string, original: string, edited: string }) => {
        diffBlock(diff.filePath, diff.original, diff.edited)
      })
    }
  }

  // Send message handler with streaming support
  async function sendMessage() {
    if (!chatInput) return
    
    const msg = chatInput.value.trim()
    if (!msg) return

    // Clear input and show user message
    chatInput.value = ''
    message('You', msg)
    
    // Show typing indicator
    const typingIndicator = createTypingIndicator()
    
    try {
      // Try streaming endpoint first, fall back to regular
      const response = await ipcRenderer.invoke('agent:send', msg)
      
      // Remove typing indicator
      if (typingIndicator && typingIndicator.parentNode) {
        typingIndicator.parentNode.removeChild(typingIndicator)
      }
      
      // Process response
      await processResponse(response)
    } catch (error) {
      // Remove typing indicator on error
      if (typingIndicator && typingIndicator.parentNode) {
        typingIndicator.parentNode.removeChild(typingIndicator)
      }
      
      // Show error message
      message('Agent', `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`)
    }
  }

  // Event listeners
  chatSendBtn.addEventListener('click', sendMessage)

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })
  
  // Auto-resize textarea
  if (chatInput) {
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto'
      chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px'
    })
  }
})

;(window as any).RINAWARP_READY = true
