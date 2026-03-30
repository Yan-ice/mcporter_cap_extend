#!/bin/bash
# Build mcporter into standalone binary using Bun
# Output: example/bin/mcporter

set -e

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
OUTPUT_DIR="$SCRIPT_DIR/dist-bun"
OUTPUT_FILE="$OUTPUT_DIR/mcporter-cap"
MCPORTER_SRC="$SCRIPT_DIR/src/cli.ts"

echo "=== mcporter build ==="
echo "Source: $MCPORTER_SRC"
echo "Output: $OUTPUT_FILE"
echo

# Check for bun
if command -v bun &> /dev/null; then
    BUN_CMD="bun"
elif [ -f "/home/$USER/.bun/bin/bun" ]; then
    BUN_CMD="/home/$USER/.bun/bin/bun"
else
    echo "[builder] bun is required but was not found on PATH." >&2
    echo "[builder] Please install bun first: curl -fsSL https://bun.sh/install | bash"
    echo "[builder] Then restart your shell and run this script again"
    exit 1
fi

echo "Using bun: $($BUN_CMD --version)"
echo

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "Checking environment..."
$BUN_CMD install

# Build
echo "Building with bun..."
$BUN_CMD build "$MCPORTER_SRC" --compile --minify --outfile "$OUTPUT_FILE"


$BUN_CMD build "$MCPORTER_SRC" --compile --minify --outfile "$OUTPUT_FILE"

# Make executable
chmod +x "$OUTPUT_FILE"

# Get size
SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)

echo
echo "Build completed!"
echo "   Binary: $OUTPUT_FILE"
echo "   Size: $SIZE"
echo

# Install to system executable directory
INSTALL_PATH="/usr/local/bin/mcporter-cap"
echo
echo "Installing to $INSTALL_PATH..."

if [ -w "/usr/local/bin" ]; then
    # Current user has write permission
    cp "$OUTPUT_FILE" "$INSTALL_PATH"
    echo "Installed successfully to $INSTALL_PATH"
elif command -v sudo &> /dev/null; then
    # Need sudo
    echo "Requesting sudo permission to install..."
    sudo cp "$OUTPUT_FILE" "$INSTALL_PATH"
    if [ $? -eq 0 ]; then
        echo "Installed successfully to $INSTALL_PATH"
    else
        echo "Installation failed"
        exit 1
    fi
else
    # Cannot install
    echo "Cannot install: /usr/local/bin is not writable and sudo is not available"
    echo "   You can manually install by running:"
    echo "   sudo cp $OUTPUT_FILE $INSTALL_PATH"
fi

echo
echo "Usage:"
echo "  mcporter-cap --help"
echo "  mcporter-cap list"
echo "  mcporter-cap call <server.tool> param:value"
echo
echo "Remember to setup these environment variable:"
echo "MCPORTER_CAPABILITIES_DIR (default = ~/.mcporter/capabilities)"
echo "MCPORTER_CAP_CLI_PATH (default = cap-cli)"
