#!/bin/bash

echo "🚀 Setting up GPU support for AutoDoc..."

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "❌ This script needs to be run with sudo"
    echo "Run: sudo ./setup-gpu.sh"
    exit 1
fi

echo "✅ Running with sudo privileges"

# Check if nvidia-smi is available (WSL2 specific paths)
NVIDIA_SMI=""
if command -v nvidia-smi &> /dev/null; then
    NVIDIA_SMI="nvidia-smi"
elif [ -f "/usr/lib/wsl/lib/nvidia-smi" ]; then
    NVIDIA_SMI="/usr/lib/wsl/lib/nvidia-smi"
else
    echo "❌ nvidia-smi not found. GPU drivers may not be installed."
    exit 1
fi

echo "✅ NVIDIA GPU detected:"
$NVIDIA_SMI -L

# Install NVIDIA Container Toolkit if not present
if ! command -v nvidia-container-toolkit &> /dev/null; then
    echo "📦 Installing NVIDIA Container Toolkit..."
    
    # Add NVIDIA repository
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    
    curl -s -L https://nvidia.github.io/libnvidia-container/ubuntu$(lsb_release -rs | tr -d '.')/libnvidia-container.list | \
        sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
        tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

    apt-get update
    apt-get install -y nvidia-container-toolkit
    
    echo "✅ NVIDIA Container Toolkit installed"
else
    echo "✅ NVIDIA Container Toolkit already installed"
fi

# Configure Docker daemon
echo "🔧 Configuring Docker daemon..."
mkdir -p /etc/docker

# Create or update daemon.json
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

echo "✅ Docker daemon configured"

# Configure NVIDIA Container Runtime
nvidia-ctk runtime configure --runtime=docker

# Restart Docker
echo "🔄 Restarting Docker service..."
systemctl restart docker

# Wait for Docker to start
sleep 5

echo "🧪 Testing GPU access in Docker..."
if docker run --rm --gpus all nvidia/cuda:11.0.3-base-ubuntu20.04 nvidia-smi > /dev/null 2>&1; then
    echo "✅ GPU support is working!"
    echo ""
    echo "🎉 You can now run AutoDoc with GPU support:"
    echo "   make up-gpu"
    echo ""
else
    echo "❌ GPU test failed. Check Docker logs:"
    echo "   docker logs <container_id>"
fi

echo "📊 Docker runtime info:"
docker info | grep -i runtime

echo ""
echo "🏁 Setup complete!"