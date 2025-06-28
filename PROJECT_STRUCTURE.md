# Project Structure - RinaWarp Terminal

**Clean, Organized, Production-Ready Structure**

## 📂 Directory Overview

```
rinawarp-terminal/
├── 📁 .github/workflows/     # CI/CD GitHub Actions
│   ├── build.yml            # Build and release workflow
│   └── pages.yml             # GitHub Pages deployment
│
├── 📁 src/                   # Application Source Code
│   ├── main.js              # Electron main process
│   ├── preload.js            # Preload scripts for security
│   ├── splash-screen.html    # App startup screen
│   └── 📁 renderer/          # Renderer process (UI)
│       ├── index.html        # Main application UI
│       ├── renderer.js       # Core terminal logic
│       ├── next-gen-ui.js    # Advanced UI features
│       └── enhanced-terminal-features.js # Extended functionality
│
├── 📁 assets/                # Icons, Images & Resources
│   ├── 📁 ico/              # Windows icons (.ico)
│   ├── 📁 icns/             # macOS icons (.icns)
│   ├── 📁 png/              # PNG images and logos
│   │   └── 📁 sizes/        # Different logo sizes
│   ├── 📁 marketing/        # Marketing materials & banners
│   └── 📁 ads/              # Advertisement assets
│
├── 📁 styles/                # CSS Stylesheets
│   ├── main.css             # Main application styles
│   ├── next-gen-ui.css      # Advanced UI components
│   ├── agent-interface.css  # AI agent interface
│   ├── performance-dashboard.css # Performance monitoring
│   └── phase2-ui.css        # Enhanced UI features
│
├── 📁 tests/                 # Test Files & Utilities
│   ├── check-phase2-status.js      # Development status checks
│   ├── phase2-diagnostic.js        # System diagnostics
│   ├── test-exports.js             # Export functionality tests
│   ├── test-security.js            # Security tests
│   ├── quick-security-test.html    # Security test UI
│   ├── test-deployment.html        # Deployment tests
│   ├── test-downloads.html         # Download tests
│   └── test-stripe.html            # Payment integration tests
│
├── 📁 tools/                 # Build & Deployment Scripts
│   ├── build-installer.bat/.ps1    # Installer creation
│   ├── deploy-website.ps1          # Website deployment
│   ├── cleanup.ps1                 # Project cleanup
│   ├── fix-deps.ps1                # Dependency fixes
│   ├── install.ps1                 # Installation script
│   ├── launch-*.bat               # Launch scripts
│   └── update-domain.ps1          # Domain updates
│
├── 📁 docs/                  # Documentation & Guides
│   ├── BUILD.md             # Build instructions
│   ├── INSTALL.md           # Installation guide
│   ├── FEATURES.md          # Feature documentation
│   ├── PLUGIN_API.md        # Plugin development API
│   ├── DEPLOYMENT_CHECKLIST.md # Deployment guide
│   ├── BRAND_IDENTITY.md    # Brand guidelines
│   ├── QUICKSTART.md        # Quick start guide
│   └── SETUP.md             # Development setup
│
├── 📁 business/              # Business & Legal Documents
│   ├── Articles_of_Organization_*.docx
│   ├── Certificate_of_Organization_*.pdf
│   ├── EIN_Application_Ready.md
│   ├── Filing_Fee_Options.md
│   └── Utah_LLC_Filing_Checklist.md
│
├── 🌐 Website Files          # GitHub Pages Website
│   ├── index.html           # Main landing page
│   ├── success.html         # Purchase success page
│   ├── pricing.html         # Pricing information
│   ├── stripe-test.html     # Payment testing
│   └── googleb4c21a9fc7fba8ea.html # Google verification
│
├── ⚙️ Configuration Files
│   ├── package.json         # Project dependencies & scripts
│   ├── jest.config.js       # Testing configuration
│   ├── .gitignore          # Git exclusions
│   ├── .env.example        # Environment variables template
│   ├── .env.template       # Environment setup guide
│   ├── firebase.json       # Firebase configuration
│   └── .firebaserc         # Firebase project settings
│
├── 🤖 Automation Scripts
│   ├── social-media-bot.js  # Social media automation
│   ├── run-social-bot.js    # Bot execution script
│   ├── weekly-social-schedule.json # Content schedule
│   └── weekly-social-schedule.md   # Schedule documentation
│
└── 📋 Project Documentation
    ├── README.md            # Main project documentation
    ├── PROJECT_STRUCTURE.md # This file
    └── server.js           # Development web server
```

## 🧹 Cleanup Summary

### ✅ Removed Unnecessary Files & Folders

**Duplicate Deployment Folders:**
- `deploy/` → Content moved to website files
- `deployment-clean/` → Redundant deployment attempt  
- `website-deploy/` → Duplicate website files
- `website-deploy-FIXED/` → Another duplicate

**Backup & Archive Folders:**
- `extracted-src-backup/` → Old source backup
- `phase2-backup/` → Development phase backup
- `releases/` → Binary releases (now in .gitignore)

**Redundant Scripts & Documentation:**
- Moved 50+ `.md` files from root to `docs/` folder
- Moved 15+ `.ps1/.bat` scripts to `tools/` folder
- Consolidated test files in `tests/` folder

**Temporary & Debug Files:**
- `energy-report.html`
- `seo-audit.html`
- `temp_github.html`
- Various `*-test.html` files

### ✅ Organized Into Logical Structure

**Business Documents → `business/`**
- LLC filing documents
- Certificates and legal papers
- Business setup checklists

**Documentation → `docs/`**
- All `.md` documentation files
- Technical guides and APIs
- Setup and deployment instructions

**Development Tools → `tools/`**
- Build scripts
- Deployment utilities
- Maintenance tools

**Testing → `tests/`**
- Unit and integration tests
- Security testing utilities
- Development diagnostics

### ✅ Updated Configuration

**Enhanced `.gitignore`:**
- Excludes business documents
- Prevents committing certificates
- Ignores temporary files
- Protects environment variables

**Updated `README.md`:**
- Reflects new project structure
- Clear organization
- Professional presentation

## 🎯 Benefits of New Structure

### 🔍 **Clarity**
- Clear separation of concerns
- Easy to find specific files
- Logical grouping of related items

### 🛡️ **Security**
- Business documents protected
- Certificates excluded from git
- Environment variables secured

### 🚀 **Professional**
- Clean repository structure
- Easy for new developers
- Industry-standard organization

### 📦 **Maintainable**
- Easier to add new features
- Clear build and deployment process
- Organized testing structure

## 🔧 Next Steps

1. **Development**: All source code is in `src/`
2. **Building**: Use scripts in `tools/` or npm scripts
3. **Testing**: Run tests from `tests/` folder
4. **Documentation**: Refer to files in `docs/`
5. **Deployment**: Use GitHub Actions workflows

## 📊 File Count Reduction

- **Before**: ~200+ files in root directory
- **After**: ~15 files in root directory
- **Reduction**: 85% cleaner root directory
- **Organization**: 5 main folders with logical structure

---

**Result**: A clean, professional, maintainable project structure ready for production deployment and team collaboration.
