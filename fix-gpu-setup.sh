#!/bin/bash

echo "🔧 Fixing GPU setup issues..."

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "❌ This script needs to be run with sudo"
    echo "Run: sudo ./fix-gpu-setup.sh"
    exit 1
fi

# Clean up corrupted repository file
echo "🧹 Cleaning up corrupted repository files..."
rm -f /etc/apt/sources.list.d/nvidia-container-toolkit.list
rm -f /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

# Since this is WSL2, let's try a different approach
# Use the official NVIDIA Container Toolkit installation for Ubuntu
echo "📦 Installing NVIDIA Container Toolkit for WSL2..."

# Method 1: Direct installation from package
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

# Use a more specific URL for Ubuntu 22.04
echo "deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://nvidia.github.io/libnvidia-container/stable/deb/\$(ARCH) /" | \
    tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# Update package list
apt-get update

# Install the toolkit
apt-get install -y nvidia-container-toolkit

# Alternative method if above fails - install from .deb package directly
if ! command -v nvidia-ctk &> /dev/null; then
    echo "🔄 Trying alternative installation method..."
    
    # Download and install directly
    cd /tmp
    wget https://github.com/NVIDIA/nvidia-container-toolkit/releases/download/v1.14.3/nvidia-container-toolkit_1.14.3-1_amd64.deb
    dpkg -i nvidia-container-toolkit_1.14.3-1_amd64.deb || apt-get install -f -y
fi

# Verify nvidia-ctk is now available
if command -v nvidia-ctk &> /dev/null; then
    echo "✅ nvidia-ctk is now available"
    
    # Configure Docker runtime
    echo "🔧 Configuring Docker runtime..."
    nvidia-ctk runtime configure --runtime=docker
    
    # Create daemon.json with proper configuration
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json <<EOF
{
    "default-runtime": "runc",
    "runtimes": {
        "nvidia": {
            "path": "nvidia-container-runtime",
            "runtimeArgs": []
        }
    }
}
EOF
    
    # Restart Docker
    echo "🔄 Restarting Docker..."
    systemctl restart docker
    
    # Wait for Docker to start
    sleep 5
    
    # Test GPU support
    echo "🧪 Testing GPU support..."
    if docker run --rm --gpus all nvidia/cuda:11.0.3-base-ubuntu20.04 nvidia-smi > /dev/null 2>&1; then
        echo "✅ GPU support is working!"
        echo ""
        echo "🎉 AutoDoc can now use GPU acceleration!"
        echo "Run: make up-gpu"
    else
        echo "❌ GPU test still failing"
        echo "Docker runtime info:"
        docker info | grep -A10 -B10 -i runtime
    fi
else
    echo "❌ nvidia-ctk installation failed"
    echo "You may need to install it manually or use Docker Desktop GPU support"
fi

echo ""
echo "🏁 Fix attempt complete!"