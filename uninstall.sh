#!/bin/bash
# Uninstall mcporter-cap from system executable directory

set -e

INSTALL_PATH="/usr/local/bin/mcporter-cap"

echo "=== mcporter-cap uninstall ==="
echo

if [ ! -f "$INSTALL_PATH" ]; then
    echo "mcporter-cap is not installed at $INSTALL_PATH"
    exit 0
fi

echo "Removing $INSTALL_PATH..."

if [ -w "$INSTALL_PATH" ] && [ -w "/usr/local/bin" ]; then
    # Current user has write permission
    rm -f "$INSTALL_PATH"
    echo "Uninstalled successfully"
elif command -v sudo &> /dev/null; then
    # Need sudo
    echo "Requesting sudo permission to uninstall..."
    sudo rm -f "$INSTALL_PATH"
    if [ $? -eq 0 ]; then
        echo "Uninstalled successfully"
    else
        echo "Uninstallation failed"
        exit 1
    fi
else
    # Cannot uninstall
    echo "Cannot uninstall: permission denied and sudo is not available"
    echo "   You can manually uninstall by running:"
    echo "   sudo rm -f $INSTALL_PATH"
    exit 1
fi

echo
