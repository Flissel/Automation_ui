#!/bin/bash

echo "Installing Desktop Capture Client for TRAE Unity AI Platform"
echo

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8+ using your package manager"
    echo "Ubuntu/Debian: sudo apt-get install python3 python3-pip"
    echo "macOS: brew install python3"
    exit 1
fi

# Install required packages
echo "Installing required Python packages..."
pip3 install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install requirements"
    echo "You may need to install additional system packages:"
    echo "Ubuntu/Debian: sudo apt-get install python3-tk python3-dev"
    exit 1
fi

# Make the script executable
chmod +x desktop_capture_client.py

echo
echo "Installation completed successfully!"
echo
echo "To start the desktop client, run:"
echo "python3 desktop_capture_client.py"
echo