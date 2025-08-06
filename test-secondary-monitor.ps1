# PowerShell Script to test secondary monitor display
# Opens a test window on the secondary monitor to verify streaming

Write-Host "Creating test window on secondary monitor..." -ForegroundColor Green

# Create a simple test window using Windows Forms
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Create form
$form = New-Object System.Windows.Forms.Form
$form.Text = "TRAE AI - Secondary Monitor Test"
$form.Size = New-Object System.Drawing.Size(800, 600)
$form.BackColor = [System.Drawing.Color]::DarkBlue
$form.ForegroundColor = [System.Drawing.Color]::White

# Position on secondary monitor (assuming 1920px wide primary monitor)
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$form.Location = New-Object System.Drawing.Point(1920, 100)

# Add labels
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "TRAE AI Desktop Streaming Test"
$titleLabel.Font = New-Object System.Drawing.Font("Arial", 24, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::Yellow
$titleLabel.Size = New-Object System.Drawing.Size(750, 50)
$titleLabel.Location = New-Object System.Drawing.Point(25, 50)
$titleLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$form.Controls.Add($titleLabel)

$infoLabel = New-Object System.Windows.Forms.Label
$infoLabel.Text = "This window is displayed on the secondary monitor.`nIf you can see this in the desktop stream,`nthe multi-monitor capture is working correctly!"
$infoLabel.Font = New-Object System.Drawing.Font("Arial", 14)
$infoLabel.ForeColor = [System.Drawing.Color]::White
$infoLabel.Size = New-Object System.Drawing.Size(750, 100)
$infoLabel.Location = New-Object System.Drawing.Point(25, 150)
$infoLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$form.Controls.Add($infoLabel)

$timeLabel = New-Object System.Windows.Forms.Label
$timeLabel.Font = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
$timeLabel.ForeColor = [System.Drawing.Color]::Lime
$timeLabel.Size = New-Object System.Drawing.Size(750, 30)
$timeLabel.Location = New-Object System.Drawing.Point(25, 300)
$timeLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$form.Controls.Add($timeLabel)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Monitor: Secondary (Monitor 1)`nResolution: 1920 x 1080`nStreaming: Active"
$statusLabel.Font = New-Object System.Drawing.Font("Arial", 12)
$statusLabel.ForeColor = [System.Drawing.Color]::Cyan
$statusLabel.Size = New-Object System.Drawing.Size(750, 80)
$statusLabel.Location = New-Object System.Drawing.Point(25, 400)
$statusLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$form.Controls.Add($statusLabel)

# Add close button
$closeButton = New-Object System.Windows.Forms.Button
$closeButton.Text = "Close Test Window"
$closeButton.Font = New-Object System.Drawing.Font("Arial", 12)
$closeButton.Size = New-Object System.Drawing.Size(200, 40)
$closeButton.Location = New-Object System.Drawing.Point(300, 500)
$closeButton.BackColor = [System.Drawing.Color]::Red
$closeButton.ForeColor = [System.Drawing.Color]::White
$closeButton.Add_Click({ $form.Close() })
$form.Controls.Add($closeButton)

# Timer to update time
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 1000
$timer.Add_Tick({
    $timeLabel.Text = "Current Time: " + (Get-Date -Format "HH:mm:ss")
})
$timer.Start()

Write-Host "Test window opened on secondary monitor. Check the desktop stream!" -ForegroundColor Yellow
Write-Host "The window will stay open until you close it manually." -ForegroundColor Cyan

# Show form
$form.ShowDialog()

# Cleanup
$timer.Stop()
$timer.Dispose()
$form.Dispose()

Write-Host "Test window closed." -ForegroundColor Green