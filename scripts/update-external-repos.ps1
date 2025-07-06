# PowerShell script for automated external repository updates
# Part of autonomous programmer project - maintains external dependencies
# Author: Autonomous Agent
# Purpose: Automatically pull updates from external repositories

param(
    [string]$RepoUrl = "",
    [string]$TargetDir = "external",
    [switch]$Force = $false
)

# Load configuration from JSON file
function Get-ExternalRepoConfig {
    $configPath = "config/external-repos.json"
    
    if (!(Test-Path $configPath)) {
        Write-Log "Configuration file not found: $configPath" "ERROR"
        throw "External repository configuration file not found"
    }
    
    try {
        $config = Get-Content $configPath -Raw | ConvertFrom-Json
        Write-Log "Loaded configuration for $($config.repositories.Count) repositories"
        return $config
    }
    catch {
        Write-Log "Failed to parse configuration file: $($_.Exception.Message)" "ERROR"
        throw "Invalid JSON configuration file"
    }
}

# Get configuration
$config = Get-ExternalRepoConfig
$ExternalRepos = $config.repositories | Where-Object { $_.enabled -eq $true }
$settings = $config.settings

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message" -ForegroundColor $(if($Level -eq "ERROR") {"Red"} elseif($Level -eq "WARN") {"Yellow"} else {"Green"})
}

function Update-ExternalRepo {
    param(
        [string]$RepoUrl,
        [string]$RepoName,
        [string]$Branch,
        [string]$TargetPath
    )
    
    try {
        Write-Log "Processing repository: $RepoName"
        
        # Create target directory if it doesn't exist
        if (!(Test-Path $TargetPath)) {
            Write-Log "Creating directory: $TargetPath"
            New-Item -ItemType Directory -Path $TargetPath -Force | Out-Null
        }
        
        # Check if it's already a git repository
        if (Test-Path "$TargetPath\.git") {
            Write-Log "Updating existing repository: $RepoName"
            Set-Location $TargetPath
            
            # Fetch latest changes
            git fetch origin
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to fetch from origin"
            }
            
            # Pull latest changes
            git pull origin $Branch
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to pull from origin/$Branch"
            }
            
            Write-Log "Successfully updated $RepoName"
        } else {
            Write-Log "Cloning repository: $RepoName"
            
            # Clone the repository
            git clone -b $Branch $RepoUrl $TargetPath
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to clone repository"
            }
            
            Write-Log "Successfully cloned $RepoName"
        }
        
        return $true
    }
    catch {
        Write-Log "Error updating $RepoName : $($_.Exception.Message)" "ERROR"
        return $false
    }
    finally {
        # Return to original directory
        Set-Location $PSScriptRoot
    }
}

# Main execution
Write-Log "Starting external repository update process"

# Store original location
$originalLocation = Get-Location
Set-Location (Split-Path $PSScriptRoot -Parent)

try {
    $successCount = 0
    $totalCount = $ExternalRepos.Count
    
    foreach ($repo in $ExternalRepos) {
        Write-Log "Processing repository: $($repo.name) (Team: $($repo.team))"
        Write-Log "Description: $($repo.description)"
        
        $success = Update-ExternalRepo -RepoUrl $repo.url -RepoName $repo.name -Branch $repo.branch -TargetPath $repo.targetPath
        if ($success) {
            $successCount++
            Write-Log "✅ Successfully updated $($repo.name)"
        } else {
            Write-Log "❌ Failed to update $($repo.name)" "ERROR"
        }
    }
    
    Write-Log "Update process completed: $successCount/$totalCount repositories updated successfully"
    
    # Create or update .gitignore to exclude external repositories
    $gitignorePath = ".gitignore"
    $externalIgnore = "# External repositories (auto-managed)`nexternal/`n"
    
    if (Test-Path $gitignorePath) {
        $gitignoreContent = Get-Content $gitignorePath -Raw
        if ($gitignoreContent -notmatch "external/") {
            Add-Content $gitignorePath "`n$externalIgnore"
            Write-Log "Added external/ to .gitignore"
        }
    } else {
        Set-Content $gitignorePath $externalIgnore
        Write-Log "Created .gitignore with external/ exclusion"
    }
}
finally {
    Set-Location $originalLocation
}

Write-Log "External repository update script completed"