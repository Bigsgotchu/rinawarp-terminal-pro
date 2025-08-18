# RinaWarp AI Testing Shell 🤖

This is an interactive command-line interface for testing your RinaWarp AI assistant. Chat with your AI, try different commands, and explore its capabilities!

## Quick Start

### 1. Start Interactive Shell
```bash
node ai_testing_shell.js
```

### 2. Run Demo
```bash
node demo_ai_shell.js
```

## Features

### Built-in Commands
- `help` - Show all commands
- `examples` - Show example AI prompts  
- `status` - Show AI system status
- `history` - Show your command history
- `models` - List available AI models
- `clear` - Clear the screen
- `exit/quit` - Exit the shell

### AI Commands
Talk to your AI naturally! Try these:

#### Code Analysis
```
analyze my project structure
review my React components for best practices
find security vulnerabilities in my API
```

#### Task Management  
```
create task: implement user authentication with JWT
break down: build e-commerce shopping cart
plan: database migration from MySQL to PostgreSQL
```

#### Code Generation
```
generate a Express.js middleware for logging
create a Python function for data validation
write TypeScript interfaces for user management
```

#### Development Help
```
explain microservices architecture patterns
best practices for React performance optimization
how to implement caching strategies in Node.js
```

## Example Session

```
🎭 RinaWarp AI Testing Shell
==================================================
🚀 Initializing AI Assistant...

✅ AI Assistant ready for interactive testing!
💡 Type 'help' for commands or start chatting with your AI
🎯 Try: 'analyze my code', 'create task: build dashboard', etc.

🤖 rina> explain React hooks

🤖 AI is thinking...

🎯 AI Response:
----------------------------------------
React Hooks are functions that let you use state and 
lifecycle features in functional components...
----------------------------------------
⚡ Response time: 2340ms

🤖 rina> generate a simple express server

🤖 AI is thinking...

🎯 AI Response:
----------------------------------------
Here's a simple Express.js server:

const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
----------------------------------------
⚡ Response time: 1890ms

🤖 rina> exit

👋 Goodbye! Your AI assistant is still running in the background.
💡 Use it in your terminal or integrate it into your applications!
```

## Tips

### Getting Better Responses
- Be specific in your questions
- Provide context when asking about code
- Ask for examples when learning new concepts
- Break complex tasks into smaller parts

### Using the Shell Effectively
- Use `history` to review previous questions
- Try `examples` for inspiration
- Use `status` to check AI performance
- Clear screen with `clear` when needed

### Troubleshooting

**AI not responding?**
- Check Ollama is running: `ollama serve`
- Verify models are available: `ollama list`
- Try simpler questions first

**Slow responses?**
- The AI is processing locally - response times vary
- Smaller models (like deepseek-coder:1.3b) are faster
- Complex questions take longer

**Import errors?**
- Make sure you're running from the project directory
- Check that all AI assistant files are in `src/ai-assistant/`

## Integration

This shell demonstrates how your AI assistant works. The same AI engine can be integrated into:

- Your terminal commands
- Development workflow  
- Code editors
- Build processes
- Documentation generation
- Code review automation

## Next Steps

1. **Try Different Questions** - Explore various types of development questions
2. **Test Code Analysis** - Ask the AI to analyze your actual project files
3. **Create Tasks** - Use the task management features for your projects
4. **Integrate** - Add AI capabilities to your existing terminal workflows

---

**Happy coding with RinaWarp AI! 🚀**
