#!/bin/bash
set -e

echo "Starting post-create setup..."

# 1. Setup isolated directories (exclude from bind mount)
# Using a hidden directory in the user's home as the destination for symlinks
DEST_BASE="/home/node/.workspace-dest"
if [ -d "$DEST_BASE" ]; then
    echo "Directory $DEST_BASE already exists. Skipping creation."
    sudo chown -R node:node "$DEST_BASE"
else
    mkdir -p "$DEST_BASE"
fi

# List of directories to exclude from bind mount
# These will be symlinked to the container-local storage
EXCLUDED_DIRS=(".turbo" ".pnpm-store")

# Remove node_modules if it's a symlink (migration from previous setup)
if [ -L "node_modules" ]; then
    echo "Removing legacy node_modules symlink..."
    rm node_modules
fi

for DIR in "${EXCLUDED_DIRS[@]}"; do
    TARGET="$DEST_BASE/$DIR"
    mkdir -p "$TARGET"
    
    # If directory exists in workspace and is NOT a symlink, delete it
    if [ -d "$DIR" ] && [ ! -L "$DIR" ]; then
        echo "Removing existing directory $DIR from workspace..."
        rm -rf "$DIR"
    fi
    
    # If symlink does not exist, create it
    if [ ! -L "$DIR" ]; then
        echo "Creating symlink for $DIR -> $TARGET"
        ln -s "$TARGET" "$DIR"
    else
        echo "$DIR is already a symlink."
    fi
done

# 2. Install dependencies (moved from devcontainer.json)
echo "Installing Python dependencies..."
pip install requests python-dotenv

echo "Installing System dependencies..."
sudo apt-get update
sudo apt-get install -y chromium xvfb

# 3. Install Node packages
if [ -f package.json ]; then
    echo "Installing Node dependencies..."
    # Ensure node_modules is owned by the node user (important for volume mounts)
    sudo chown -R node:node node_modules 2>/dev/null || true
    pnpm install --frozen-lockfile
fi

echo "Post-create setup complete!"
