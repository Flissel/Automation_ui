# Runtime Directory

This directory contains all runtime-generated files and temporary storage for the TRAE Backend.

## Subdirectories

### Screenshots & Media
- **`desktop_screenshots/`** - Desktop screenshots captured during automation
- **`click_masks/`** - Visual click masks for automation targeting

### Data Storage
- **`data/`** - General data storage for processing
- **`md_files/`** - Markdown files loaded and processed
- **`workflows/`** - Workflow JSON files and execution data
- **`workspaces/`** - User workspace data and configurations
- **`project_files/`** - Project-specific files and layer workflows

### System Files
- **`logs/`** - Application log files
- **`temp/`** - Temporary files and processing data
- **`sql/`** - SQL scripts and database-related files

## ⚠️ Important Notes

- **All directories are auto-created** when needed by the application
- **Contents are temporary** - can be safely deleted during development
- **Not committed to git** - runtime directory should be gitignored
- **Recreated on startup** - application will create missing directories

## Maintenance

To clean runtime data:
```bash
# Clean all runtime data (safe during development)
rm -rf backend/runtime/*

# Application will recreate directories as needed
```

## Docker Integration

In Docker environments, consider mounting these directories as volumes for:
- Persistent workflow data
- Log file access
- Screenshot/media persistence 