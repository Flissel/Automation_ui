# External Repository Integration

## Overview

This system allows automatic integration and synchronization of external repositories maintained by other teams. It provides automated pulling of commits, conflict resolution, and maintains a clean separation between your main codebase and external dependencies.

## Features

- 🔄 **Automated Updates**: Daily scheduled updates via GitHub Actions
- 📋 **JSON Configuration**: Easy-to-manage repository settings
- 🏷️ **Team Attribution**: Track which team maintains each repository
- 🔧 **Flexible Settings**: Configurable update frequency and conflict resolution
- 📊 **Detailed Logging**: Comprehensive update reports and error handling
- 🚫 **Git Integration**: Automatic .gitignore management for external repos

## Directory Structure

```
trusted-login-system/
├── config/
│   └── external-repos.json          # Repository configuration
├── scripts/
│   └── update-external-repos.ps1    # Update automation script
├── .github/workflows/
│   └── update-external-repos.yml    # GitHub Actions workflow
├── external/                         # External repositories (auto-managed)
│   ├── shared-ui-components/
│   ├── common-utilities/
│   └── api-schemas/
└── docs/
    └── external-repos.md            # This documentation
```

## Configuration

### Adding a New External Repository

Edit `config/external-repos.json` to add a new repository:

```json
{
  "repositories": [
    {
      "name": "your-repo-name",
      "url": "https://github.com/team/repository.git",
      "branch": "main",
      "targetPath": "external/your-repo-name",
      "team": "Team Name",
      "description": "Brief description of the repository",
      "enabled": true,
      "updateFrequency": "daily",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

### Configuration Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | ✅ | Unique identifier for the repository |
| `url` | string | ✅ | Git repository URL (HTTPS or SSH) |
| `branch` | string | ❌ | Branch to track (default: "main") |
| `targetPath` | string | ✅ | Local path for cloning |
| `team` | string | ✅ | Team maintaining the repository |
| `description` | string | ❌ | Repository description |
| `enabled` | boolean | ❌ | Include in updates (default: true) |
| `updateFrequency` | string | ❌ | Update frequency: daily/weekly/manual |
| `tags` | array | ❌ | Tags for categorization |

### Global Settings

```json
{
  "settings": {
    "autoCommit": true,
    "createPullRequest": false,
    "notifyOnUpdates": true,
    "conflictResolution": "abort",
    "maxRetries": 3
  }
}
```

## Usage

### Manual Update

Run the PowerShell script manually:

```powershell
# Update all enabled repositories
.\scripts\update-external-repos.ps1

# Force update with specific parameters
.\scripts\update-external-repos.ps1 -Force
```

### Automated Updates

The GitHub Actions workflow runs automatically:

- **Daily**: Every day at 2 AM UTC
- **On Configuration Changes**: When external repo config is modified
- **Manual Trigger**: Via GitHub Actions UI

### Manual Trigger via GitHub Actions

1. Go to your repository on GitHub
2. Navigate to **Actions** tab
3. Select **Update External Repositories** workflow
4. Click **Run workflow**
5. Optionally enable "Force update"

## Integration in Your Code

### Importing External Components

```typescript
// Import from external UI components
import { Button, Card } from '../external/shared-ui-components/src/components';

// Import utilities
import { formatDate, validateEmail } from '../external/common-utilities/src/utils';

// Import API types
import type { UserProfile, ApiResponse } from '../external/api-schemas/src/types';
```

### TypeScript Path Mapping

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@external/*": ["./external/*/src"]
    }
  }
}
```

Then import with cleaner paths:

```typescript
import { Button } from '@external/shared-ui-components';
import { formatDate } from '@external/common-utilities';
```

## Best Practices

### 1. Repository Organization

- Keep external repositories in the `external/` directory
- Use descriptive names that match the source repository
- Document the purpose and team ownership

### 2. Dependency Management

- **Don't modify external code directly** - changes will be overwritten
- Create wrapper components if customization is needed
- Use TypeScript interfaces to define expected APIs

### 3. Version Control

- External repositories are automatically added to `.gitignore`
- Only configuration files are tracked in your main repository
- Updates are committed automatically with descriptive messages

### 4. Conflict Resolution

- Set `conflictResolution` to `"abort"` for safety
- Monitor workflow logs for failed updates
- Coordinate with external teams for breaking changes

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure repository URLs are accessible
   - Check if private repositories need authentication
   - Verify GitHub token permissions

2. **Merge Conflicts**
   - Review external repository changes
   - Coordinate with maintaining team
   - Consider using specific branches or tags

3. **Network Issues**
   - Check GitHub Actions logs
   - Verify repository URLs are correct
   - Ensure external repositories are accessible

### Debugging

Enable verbose logging in the PowerShell script:

```powershell
$VerbosePreference = "Continue"
.\scripts\update-external-repos.ps1
```

Check GitHub Actions logs:

1. Go to **Actions** tab in your repository
2. Select the failed workflow run
3. Expand the failed step to see detailed logs

## Security Considerations

- Only add trusted repositories from known teams
- Regularly review external repository contents
- Monitor for unexpected changes in automated updates
- Use HTTPS URLs for public repositories
- Ensure proper access controls for private repositories

## Team Coordination

### Communication

- Notify teams when adding their repositories
- Establish update schedules and communication channels
- Document breaking changes and migration paths

### Versioning Strategy

- Consider using specific branches or tags for stability
- Coordinate major version updates
- Test external updates in development environments first

## Monitoring and Maintenance

- Review automated update logs regularly
- Monitor for failed updates and resolve issues promptly
- Keep configuration file up to date
- Remove unused external repositories
- Update documentation when adding new integrations

---

**Note**: This system is part of the autonomous programmer project and follows established coding standards and conventions for maintainability and debugging.