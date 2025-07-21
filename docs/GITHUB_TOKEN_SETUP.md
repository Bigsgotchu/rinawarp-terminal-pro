# GitHub Token Setup for Auto-Updates

## Why You Need a GitHub Token

The GitHub token is required for:
- Publishing releases to GitHub
- Enabling auto-update functionality
- Accessing private repositories (if applicable)

## Step 1: Create a Personal Access Token

1. Sign in to GitHub
2. Go to Settings > Developer settings > Personal access tokens > Tokens (classic)
3. Click "Generate new token"
4. Give it a descriptive name: "RinaWarp Terminal Release"
5. Set expiration (recommend 90 days and renew regularly)
6. Select the following scopes:
   - `repo` (Full control of private repositories)
   - `write:packages` (Upload packages to GitHub Package Registry)
   - `read:packages` (Download packages from GitHub Package Registry)
   
7. Click "Generate token"
8. **IMPORTANT**: Copy the token immediately (you won't see it again)

## Step 2: Update .env.local

Add the token to your .env.local file:

```env
# Auto-update Configuration
GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 3: Verify Token Permissions

Test your token with curl:

```bash
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
```

## Security Best Practices

1. **Never commit tokens** to version control
2. **Rotate tokens regularly** (every 90 days)
3. **Use minimal scopes** needed for your use case
4. **Store securely** in password managers
5. **Use GitHub Secrets** for CI/CD workflows

## Alternative: Fine-grained Personal Access Tokens

GitHub now offers fine-grained tokens with more specific permissions:

1. Go to Settings > Developer settings > Personal access tokens > Fine-grained tokens
2. Click "Generate new token"
3. Select repository access (specific repos or all)
4. Set permissions:
   - Contents: Read and Write
   - Metadata: Read
   - Packages: Write
5. Generate and save the token

## For GitHub Actions (CI/CD)

If using GitHub Actions for automated builds:

1. Go to your repository settings
2. Navigate to Secrets and variables > Actions
3. Add a new repository secret named `GH_TOKEN`
4. Paste your personal access token as the value

Your workflow can then use: `${{ secrets.GH_TOKEN }}`
