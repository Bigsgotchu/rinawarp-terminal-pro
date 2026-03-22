/**
 * RinaWarp Error Explainer
 *
 * Uses AI to explain developer errors and provide fixes.
 */

/**
 * Explain an error using AI
 */
export async function explainError(errorText: string, context?: string): Promise<string> {
  // Check for pattern-based explanations first
  const patternMatch = explainErrorPattern(errorText)
  if (patternMatch) {
    return patternMatch
  }

  // Try to get API key from environment
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return `Error: OpenAI API key not configured.
    
To enable AI error explanations:
1. Set OPENAI_API_KEY environment variable
2. Or use pattern matching for common errors

Also try 'rina doctor' for automatic diagnostics.`
  }

  try {
    const systemPrompt = `You are RinaWarp, an AI developer assistant. Your job is to explain developer errors and provide clear, actionable fixes.

Guidelines:
- Explain the error in simple terms
- Provide specific commands to fix it
- If multiple solutions exist, list them
- Keep responses concise but informative
- Use code blocks for commands`

    const userMessage = context ? `Context: ${context}\n\nError:\n${errorText}` : `Error:\n${errorText}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = (await response.json()) as any
    return data.choices[0].message.content
  } catch (error: any) {
    return `Failed to explain error: ${error.message}

Try running 'rina doctor' for automatic diagnostics.`
  }
}

/**
 * Quick error patterns - no API needed
 */
export function explainErrorPattern(errorText: string): string | null {
  const patterns: Record<string, { title: string; fix: string }> = {
    ENOENT: {
      title: 'File Not Found',
      fix: 'The file or directory does not exist. Check the path and ensure the file was created.',
    },
    EACCES: {
      title: 'Permission Denied',
      fix: "You don't have permission to access this file.\nTry: sudo chown -R $USER .",
    },
    ECONNREFUSED: {
      title: 'Connection Refused',
      fix: "The server isn't running or port is blocked.\nCheck if the service is running and try again.",
    },
    'npm install error': {
      title: 'npm Install Failed',
      fix: 'Try these steps:\n1. rm -rf node_modules package-lock.json\n2. npm cache clean --force\n3. npm install',
    },
    docker: {
      title: 'Docker Issue',
      fix: 'Common fixes:\n1. docker system prune -a\n2. docker-compose down && docker-compose up -d\n3. Check Docker daemon is running',
    },
    'git merge': {
      title: 'Git Merge Conflict',
      fix: '1. Open conflicting files\n2. Resolve conflicts manually\n3. git add <files>\n4. git commit',
    },
    typescript: {
      title: 'TypeScript Error',
      fix: 'Try:\n1. npx tsc --noEmit\n2. Check tsconfig.json\n3. Install types: npm i -D @types/<package>',
    },
  }

  const lowerError = errorText.toLowerCase()

  for (const [pattern, solution] of Object.entries(patterns)) {
    if (lowerError.includes(pattern.toLowerCase())) {
      return `🔍 ${solution.title}\n\n💡 ${solution.fix}`
    }
  }

  return null
}
