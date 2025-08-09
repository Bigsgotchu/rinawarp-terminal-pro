#!/usr/bin/env node

/*
 * 🧜‍♀️ RinaWarp Terminal - AI-focused Server
 * Demonstrates working CLI AI integration without Stripe dependencies
 */

const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Import our CLI AI handler (simulate the integration)
function generateAIResponse(query) {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('large files') || lowerQuery.includes('find')) {
    return `🧜‍♀️ **Looking for large files?** Here are the best methods:

🔍 **Find Large Files:**
• \`find . -type f -size +100M\` - Files over 100MB
• \`du -h . | sort -hr | head -20\` - Top 20 largest directories  
• \`ls -lah | sort -k5 -hr\` - Sort current directory by size
• \`ncdu\` - Interactive disk usage analyzer (if installed)

💎 **Pro Tips:**
• Use \`find / -type f -size +1G 2>/dev/null\` for system-wide search
• Try \`du -sh */ | sort -hr\` for directory sizes only
• \`find . -name "*.log" -size +50M\` for specific file types

🌊 *Like finding pearls in the digital ocean depths!*`;
  }

  if (lowerQuery.includes('git')) {
    return `🧜‍♀️ **Git mastery, coming right up!**

🐙 **Git Essentials for Beginners:**
• \`git init\` - Initialize a new repository
• \`git clone <url>\` - Copy a repository  
• \`git status\` - Check what's changed
• \`git add .\` - Stage all changes
• \`git commit -m "your message"\` - Save changes
• \`git push\` - Upload to remote repository
• \`git pull\` - Download latest changes

🌊 **Advanced Flow:**
• \`git branch feature-name\` - Create new branch
• \`git checkout feature-name\` - Switch branches
• \`git merge feature-name\` - Combine branches  
• \`git log --oneline\` - View commit history

*Git flows like ocean currents - master the flow, master the code! 🌊*`;
  }

  if (lowerQuery.includes('docker')) {
    return `🧜‍♀️ **Docker containers** - like magical underwater bubbles!

🐳 **Docker Fundamentals:**
• \`docker ps\` - List running containers
• \`docker images\` - Show available images
• \`docker run -it ubuntu bash\` - Run interactive container
• \`docker build -t myapp .\` - Build image from Dockerfile
• \`docker logs <container-id>\` - View container logs
• \`docker stop <container-id>\` - Stop container

🧹 **Maintenance:**
• \`docker system prune\` - Clean up unused resources
• \`docker container prune\` - Remove stopped containers
• \`docker image prune\` - Remove unused images

*Each container is a perfectly isolated underwater world! 🫧*`;
  }

  if (
    lowerQuery.includes('system') ||
    lowerQuery.includes('monitor') ||
    lowerQuery.includes('performance')
  ) {
    return `🧜‍♀️ **System monitoring** like checking the ocean's vital signs:

📊 **System Resources:**
• \`htop\` - Interactive system monitor
• \`free -h\` - Memory usage
• \`df -h\` - Disk space usage
• \`du -sh *\` - Directory sizes
• \`uptime\` - System uptime and load
• \`iostat\` - I/O statistics

🔥 **Performance Analysis:**
• \`top -o cpu\` - Top CPU processes
• \`ps aux --sort=-%mem | head\` - Memory hogs
• \`iotop\` - Disk I/O monitor (if installed)
• \`nethogs\` - Network usage by process

*Monitoring systems like a mermaid watching over her coral reef! 🪸*`;
  }

  return `🧜‍♀️ **Hello from the AI-powered depths!** 

*🌊 From my mermaid perspective, I can help you with:*

🌟 **My Specialties:**
• Terminal commands and shell operations
• File and directory management  
• Git version control workflows
• Docker containerization
• System monitoring and performance
• Programming and debugging assistance

💡 **Try asking me:**
• "How do I find large files?"
• "Git commands for beginners"
• "Docker container basics"
• "System performance monitoring"

*The more specific your question, the more magical my response! ✨*`;
}

// AI CLI endpoint
app.post('/api/ai/cli-ask', (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Query is required',
    });
  }

  console.log(`🧜‍♀️ AI Query: "${query}"`);

  const response = generateAIResponse(query);

  res.json({
    success: true,
    response: response,
    provider: 'ai-server',
    timestamp: new Date().toISOString(),
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: '🧜‍♀️ AI Server is swimming smoothly!',
    timestamp: new Date().toISOString(),
  });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🧜‍♀️ AI Server running on http://localhost:${PORT}`);
  console.log('🌊 Ready for CLI AI integration testing!');
  console.log('💡 Try: node bin/rina ask "How do I find large files?"');
});
