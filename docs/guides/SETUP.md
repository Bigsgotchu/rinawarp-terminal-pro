# Setup Guide

## Development Environment Setup

This guide covers the complete setup process for developing RinaWarp Terminal.

### Prerequisites

- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
- **npm 9+** - Comes with Node.js
- **Git** - For version control
- **Valid Development License** - Contact RinaWarp Technologies

### System Requirements

#### Windows
- Windows 10 or later
- PowerShell 5.1 or later
- Visual Studio Build Tools (for native modules)

#### macOS
- macOS 10.14 or later
- Xcode Command Line Tools
- Homebrew (recommended)

#### Linux
- Ubuntu 18.04+ / Debian 10+ / CentOS 7+
- Build essentials package
- libgtk-3-dev (for Electron)

### Installation Steps

1. **Clone the repository** (authorized developers only):
   ```bash
   git clone https://github.com/Bigsgotchu/rinawarp-terminal.git
   cd rinawarp-terminal
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your configuration
   # See Environment Variables section below
   ```

4. **Build assets**:
   ```bash
   npm run copy-assets
   npm run build:css
   ```

5. **Run development server**:
   ```bash
   npm run dev
   ```

### Environment Variables

Create a `.env` file in the project root with these variables:

```env
# Development
NODE_ENV=development
PORT=3000

# Stripe Configuration (for billing features)
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PRICE_PERSONAL=price_your_personal_plan_price_id
STRIPE_PRICE_PROFESSIONAL=price_your_professional_plan_price_id
STRIPE_PRICE_TEAM=price_your_team_plan_price_id

# Optional: SendGrid for email
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Optional: JWT Secret for authentication
JWT_SECRET=your_jwt_secret_here
```

### Development Commands

```bash
# Start development server
npm run dev

# Start with CSS watching
npm run dev:css

# Run tests
npm test
npm run test:core

# Linting and formatting
npm run lint
npm run format

# Building
npm run build
npm run build:win
npm run build:mac
npm run build:linux
```

### Project Structure

```
rinawarp-terminal/
├── src/                    # Application source code
│   ├── main.cjs           # Electron main process
│   ├── preload.js         # Preload scripts
│   └── renderer/          # Renderer process files
├── public/                # Static assets
├── styles/                # CSS and styling
├── scripts/               # Build and utility scripts
├── tests/                 # Test files
├── docs/                  # Documentation
└── dist/                  # Build output
```

### Troubleshooting

#### Node.js Version Issues
```bash
# Check Node.js version
node --version

# Use nvm to manage Node.js versions
nvm install 18
nvm use 18
```

#### Permission Issues (Linux/macOS)
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

#### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### IDE Configuration

#### Visual Studio Code
Recommended extensions:
- ESLint
- Prettier
- JavaScript (ES6) code snippets
- GitLens

#### Settings
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### Next Steps

- Read the [Installation Guide](INSTALL.md) for distribution
- Check the [API Documentation](../API.md) for integration
- Review the [Contributing Guidelines](../../CONTRIBUTING.md)

### Support

For development support:
- Create an issue on GitHub
- Contact the development team
- Check the troubleshooting section above
