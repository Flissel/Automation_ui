# Multi-Repository Workflow Guide

## Overview

This guide explains how to work with three repositories simultaneously in the trusted-login-system project, with selective content filtering and branch management capabilities.

## Repository Configuration

### Current Setup

The system is configured to work with three repositories:

1. **autogen-event-agents** (Backend Development)
   - **Source**: `c:\code\unityai\Trae-integration\trae-remote\backend\services\autogen-event-agents`
   - **Content**: API specifications and documentation only
   - **Filtered Files**: 
     - ✅ `events/*.yml` (API event specifications)
     - ✅ `departments/**/*.md` (Documentation)
     - ✅ `README.md` (Main documentation)
     - ✅ `pyproject.toml` (Project configuration)
     - ❌ `src/**` (Source code excluded)
     - ❌ `tests/**` (Test files excluded)

2. **frontend-components** (Frontend Team)
   - **Purpose**: Shared frontend components and UI library
   - **Branch**: `develop`
   - **Update Frequency**: Daily

3. **shared-utilities** (Platform Team)
   - **Purpose**: Common utilities and helper functions
   - **Branch**: `main`
   - **Update Frequency**: Weekly

## Quick Start Commands

### Repository Management

```bash
# Install dependencies (including glob for pattern matching)
npm install

# List all repositories and their branch status
npm run branch:list

# Update all external repositories
npm run update-external

# Force update with verbose logging
npm run update-external:force -- --verbose
```

### Branch Management

```bash
# Switch autogen-event-agents to a different branch
npm run branch:switch autogen-event-agents feature/api-docs

# Create a new working branch
npm run branch:create autogen-event-agents feature/new-events main

# Update repository configuration to use new branch
npm run branch:update autogen-event-agents develop
```

## Selective Content Filtering

### How It Works

The system uses pattern matching to selectively copy only specific files from the backend repository:

```javascript
// Include patterns - only these files are copied
"includePatterns": [
  "events/*.yml",           // API event specifications
  "departments/**/*.md",    // Documentation files
  "README.md",              // Main documentation
  "pyproject.toml"          // Project configuration
],

// Exclude patterns - these files are ignored
"excludePatterns": [
  "src/**",                 // Source code
  "tests/**",               // Test files
  "*.lock",                 // Lock files
  ".git/**"                 // Git metadata
]
```

### Benefits

- **Security**: Source code remains in the backend repository
- **Focus**: Frontend team only sees relevant API specifications
- **Performance**: Faster updates with smaller file sets
- **Clarity**: Clear separation of concerns

## Working with Multiple Repositories

### Daily Workflow

1. **Start of Day**
   ```bash
   # Check repository status
   npm run branch:list
   
   # Update all repositories
   npm run update-external
   ```

2. **During Development**
   ```bash
   # Switch to feature branch for backend API specs
   npm run branch:switch autogen-event-agents feature/new-api
   
   # Update to get latest changes
   npm run update-external:force
   ```

3. **Branch Management**
   ```bash
   # Create working branch for new feature
   npm run branch:create frontend-components feature/auth-ui develop
   
   # Switch between branches as needed
   npm run branch:switch shared-utilities hotfix/security-patch
   ```

### File Structure After Update

```
trusted-login-system/
├── external/
│   ├── autogen-event-agents/          # Backend API specs & docs only
│   │   ├── events/
│   │   │   ├── api_integration_event.yml
│   │   │   ├── content_creation_event.yml
│   │   │   └── ...
│   │   ├── departments/
│   │   │   ├── 00-captain/
│   │   │   ├── 01-architecture/
│   │   │   └── ...
│   │   ├── README.md
│   │   └── pyproject.toml
│   ├── frontend-components/           # Full repository
│   │   ├── src/
│   │   ├── components/
│   │   └── ...
│   └── shared-utilities/              # Full repository
│       ├── lib/
│       ├── utils/
│       └── ...
```

## Integration in Your Code

### Importing API Specifications

```typescript
// Import event schemas for type safety
import { ApiIntegrationEvent } from '../external/autogen-event-agents/events/api_integration_event.yml';

// Use department documentation for implementation guidance
// See: external/autogen-event-agents/departments/01-architecture/
```

### Using Frontend Components

```typescript
// Import shared UI components
import { AuthButton, LoginForm } from '../external/frontend-components/src/components';

// Import utilities
import { validateEmail, formatDate } from '../external/shared-utilities/lib/utils';
```

### TypeScript Path Mapping

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@external/*": ["./external/*"],
      "@api-specs/*": ["./external/autogen-event-agents/*"],
      "@components/*": ["./external/frontend-components/src/*"],
      "@utils/*": ["./external/shared-utilities/lib/*"]
    }
  }
}
```

## Advanced Configuration

### Adding New Repositories

Edit `config/external-repos.json`:

```json
{
  "repositories": [
    {
      "name": "new-repository",
      "url": "https://github.com/your-org/new-repo.git",
      "branch": "main",
      "targetPath": "external/new-repository",
      "team": "Your Team",
      "description": "Description of the repository",
      "enabled": true,
      "updateFrequency": "daily",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

### Custom Include/Exclude Patterns

For selective content filtering:

```json
{
  "includePatterns": [
    "docs/**/*.md",
    "api/**/*.json",
    "schemas/**/*.yml"
  ],
  "excludePatterns": [
    "node_modules/**",
    "*.log",
    "temp/**"
  ]
}
```

## Automation

### GitHub Actions

The system includes automated updates via GitHub Actions:

- **Daily Updates**: Automatically pulls latest changes
- **Manual Triggers**: Run updates on demand
- **Configuration Changes**: Updates when config files change

### Local Automation

Set up local automation with cron jobs or task schedulers:

```bash
# Add to crontab for hourly updates
0 * * * * cd /path/to/project && npm run update-external
```

## Troubleshooting

### Common Issues

1. **Pattern Matching Errors**
   ```bash
   # Install glob dependency
   npm install
   
   # Test patterns manually
   node -e "console.log(require('glob').sync('events/*.yml', {cwd: 'path/to/source'}))"
   ```

2. **Branch Conflicts**
   ```bash
   # Check current branch status
   npm run branch:list
   
   # Force switch to correct branch
   npm run branch:switch repo-name correct-branch
   ```

3. **Local Path Issues**
   ```bash
   # Verify local repository exists
   ls -la "c:\code\unityai\Trae-integration\trae-remote\backend\services\autogen-event-agents"
   
   # Update configuration if path changed
   # Edit config/external-repos.json
   ```

### Debug Mode

```bash
# Enable verbose logging
npm run update-external:verbose

# Check individual repository status
node scripts/branch-manager.js list
```

## Best Practices

### Security

- ✅ Use selective filtering to avoid exposing sensitive code
- ✅ Regularly review include/exclude patterns
- ✅ Monitor automated updates for unexpected changes
- ❌ Never include credentials or secrets in external repositories

### Performance

- ✅ Use specific include patterns instead of excluding everything
- ✅ Limit update frequency for large repositories
- ✅ Use local file:// URLs for local repositories when possible
- ❌ Avoid including large binary files or build artifacts

### Team Coordination

- ✅ Document branch naming conventions
- ✅ Communicate branch changes to team members
- ✅ Use descriptive commit messages for configuration changes
- ✅ Test configuration changes before committing

## Monitoring

### Update Reports

The system generates detailed reports after each update:

```
=== External Repository Update Report ===
Timestamp: 2024-01-15T10:30:00.000Z
Success Rate: 3/3 repositories updated

External repositories found:
  📁 autogen-event-agents (branch: main)
     Latest: a1b2c3d - Add new API event schema (2 hours ago)
  📁 frontend-components (branch: develop)
     Latest: e4f5g6h - Update button component styles (1 day ago)
  📁 shared-utilities (branch: main)
     Latest: i7j8k9l - Fix date formatting utility (3 days ago)
=== End Report ===
```

### Health Checks

```bash
# Verify all repositories are healthy
npm run branch:list

# Check for configuration issues
node scripts/update-external-repos.js --help
```

This multi-repository workflow enables efficient collaboration across teams while maintaining security and clarity through selective content filtering and automated branch management.