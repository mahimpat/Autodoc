# AutoDoc v7 - AI-Powered Document Generation Platform

AutoDoc is a comprehensive, production-ready document generation platform that leverages AI to create professional documentation, research reports, API documentation, and more. Built with FastAPI, Next.js, and powered by local LLM inference through Ollama.

## 🚀 Key Features

### 📝 Real-Time Document Generation
- **Streaming Visual Editor**: Watch documents being generated in real-time with a rich text editor
- **Google Docs-like Experience**: Live editing with streaming content integration
- **Pause/Resume/Stop Controls**: Full control over document generation process
- **Auto-save**: Automatic saving with debounced updates

### 🎨 Modern UI/UX
- **Glass Morphism Design**: Professional, modern interface with subtle aurora backgrounds
- **Dark/Light Theme**: Complete theme support with system preference detection
- **Responsive Design**: Mobile-first approach optimized for all devices
- **Professional Component Library**: Consistent design system with modern color palettes

### 🤖 AI-Powered Generation
- **Multiple LLM Support**: Ollama integration with support for various models (Mistral 7B, Llama 3.1 8B+)
- **GPU Acceleration**: NVIDIA GPU support for faster inference in WSL2/Linux environments
- **Template-Driven**: YAML-based document templates for structured generation
- **Smart Content Processing**: Advanced document extraction and embedding-based search

### 📄 Document Management
- **Rich Text Editor**: TipTap-powered editor with full formatting capabilities
- **PDF Export**: Professional PDF generation with AutoDoc branding
- **File Upload Support**: Process various document formats for content-driven generation
- **Version Control**: Document versioning and collaborative editing features

### 🏢 Enterprise Features
- **Multi-Tenant Architecture**: Organization and workspace management
- **User Authentication**: JWT-based session management with HTTP-only cookies
- **Role-Based Access**: Granular permissions (owner, admin, member, viewer)
- **Billing Integration**: Stripe-powered subscription management with usage analytics

### 🔧 Developer Experience
- **Hot Reloading**: Full development setup with live code updates
- **Docker Compose**: Complete containerized development and deployment
- **Type Safety**: Full TypeScript coverage for frontend and Python typing for backend
- **API Documentation**: Auto-generated API docs with FastAPI

## 🛠 Tech Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **PostgreSQL + pgvector** - Database with vector embeddings support
- **Redis** - Caching and session management
- **MinIO** - S3-compatible file storage
- **Ollama** - Local LLM inference engine
- **Celery** - Background task processing

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **TipTap** - Rich text editor
- **Zustand** - State management
- **Heroicons** - Consistent icon library

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **NVIDIA Container Toolkit** - GPU acceleration support
- **Stripe** - Payment processing
- **WSL2** - Windows Subsystem for Linux support

## 🚦 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)
- NVIDIA GPU + drivers (optional, for GPU acceleration)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd autodoc_v7
cp .env.example .env
```

### 2. Start Services
```bash
# Build and start all services
make up

# Or manually:
docker compose up -d
```

### 3. Pull AI Model
```bash
# Default model (Mistral 7B)
make pull-model

# Or specify a different model:
make pull-model MODEL=llama3.1:8b
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **MinIO Console**: http://localhost:9001

### Test Credentials
- **Email**: `demo@autodoc.ai`
- **Password**: `demo123456`

## ⚡ GPU Acceleration (WSL2/Linux)

For significantly faster document generation, enable GPU acceleration:

### 1. Install NVIDIA Container Toolkit
```bash
# Add NVIDIA repository
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

# Install and configure
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### 2. Verify GPU Support
```bash
# Test GPU availability
make gpu-test

# Check GPU usage in Ollama container
make gpu-check
```

### 3. Start Services with GPU Support
```bash
make down
make up-gpu
```

**Note**: Use `make up` for CPU-only mode if you don't have NVIDIA GPU support set up.

## 📋 Available Commands

### Docker/Container Management
```bash
make up          # Start all services (CPU mode)
make up-gpu      # Start all services with GPU support
make down        # Stop all services
make rebuild     # Full rebuild and restart
make logs-api    # View API logs
make logs-frontend # View frontend logs
make logs-ollama # View Ollama logs
```

### AI Model Management
```bash
make pull-model                    # Pull default model (mistral:7b)
make pull-model MODEL=llama3.1:8b # Pull specific model
```

### GPU Commands
```bash
make gpu-test    # Test GPU availability
make gpu-check   # Check GPU usage in Ollama
```

### Development
```bash
# Frontend development
cd frontend && npm run dev    # Dev server on :3000
cd frontend && npm run build  # Production build
cd frontend && npm start      # Production server

# Backend development (with hot reload via Docker)
# API automatically reloads when files change
```

## 🏗 Architecture Overview

### Core Services
- **API Server** (`backend/`): FastAPI application handling authentication, document processing, and LLM orchestration
- **Frontend** (`frontend/`): Next.js application with modern React components and real-time streaming
- **Worker** (`worker/`): Celery-based background task processing
- **Database**: PostgreSQL with pgvector for embeddings and vector search
- **Storage**: MinIO for file uploads and document storage
- **Cache/Sessions**: Redis for caching and session management
- **AI Engine**: Ollama for local LLM inference with GPU support

### Key Directories
```
├── backend/
│   ├── app/
│   │   ├── routers/          # API endpoints
│   │   ├── models.py         # Database models
│   │   ├── processing/       # Document processing
│   │   ├── llm/             # LLM integration
│   │   └── main.py          # FastAPI app
├── frontend/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   │   └── ui/             # Design system components
│   └── lib/                # Utilities and contexts
├── templates/              # Document generation templates
├── docker-compose.yml      # Main service definitions
└── Makefile               # Development commands
```

## 📖 Document Generation Templates

AutoDoc supports various document types through YAML templates:

- **README Documentation** (`templates/project_documentation.yaml`)
- **API Documentation** (`templates/technical_documentation.yaml`)
- **Research Reports** (`templates/content_driven_docs.yaml`)
- **Contract Analysis** (`templates/uploaded_contract_analysis.yaml`)
- **Content-Driven Docs** (`templates/uploaded_content_docs.yaml`)

## 🎯 Use Cases

### For Developers
- **API Documentation**: Generate comprehensive API docs from code
- **README Files**: Create professional project documentation
- **Technical Guides**: Convert code and comments into user guides
- **Code Documentation**: Generate inline and external documentation

### For Teams
- **Project Reports**: Compile team progress and technical summaries
- **Meeting Notes**: Structure and format meeting outputs
- **Process Documentation**: Document workflows and procedures
- **Training Materials**: Create onboarding and educational content

### For Businesses
- **Contract Analysis**: AI-powered legal document review
- **Research Reports**: Generate insights from uploaded content
- **Policy Documents**: Create and maintain company policies
- **Client Deliverables**: Professional client-facing documentation

## 🔒 Security & Compliance

- **Authentication**: JWT-based sessions with HTTP-only cookies
- **CORS Protection**: Configured for secure cross-origin requests
- **Input Validation**: Comprehensive request validation and sanitization
- **File Upload Security**: Secure file handling with type validation
- **Database Security**: Parameterized queries and ORM-based access
- **Container Security**: Read-only mounts and minimal attack surface

## 🚀 Production Deployment

### Environment Configuration
Key environment variables to configure:

```bash
# Database
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_db

# Storage (MinIO/S3)
S3_ENDPOINT=your_s3_endpoint
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key

# Authentication
SECRET_KEY=your_secret_key
SESSION_LIFETIME_HOURS=24

# LLM
OLLAMA_URL=http://ollama:11434
OLLAMA_DEFAULT_MODEL=mistral:7b

# Payments (optional)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# CORS
CORS_ORIGINS=https://yourdomain.com
```

### Scaling Considerations
- **Horizontal Scaling**: Add multiple API and worker instances
- **Database**: Consider PostgreSQL clustering for high availability
- **Storage**: Use cloud S3 services for production file storage
- **Caching**: Redis clustering for session distribution
- **GPU Resources**: Scale GPU instances for high-throughput generation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup
```bash
# Clone repo
git clone <your-fork>
cd autodoc_v7

# Setup environment
cp .env.example .env
make up

# Start development with hot reload
# Backend and frontend will auto-reload on changes
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Documentation

- **Issues**: Report bugs and request features on GitHub Issues
- **API Documentation**: Available at `/docs` endpoint when running
- **Development Guide**: See `CLAUDE.md` for detailed development instructions

## 🏆 Acknowledgments

- **Ollama** for local LLM inference capabilities
- **TipTap** for the excellent rich text editing experience
- **FastAPI** for the high-performance backend framework
- **Next.js** for the modern React development experience

---

**Built with ❤️ by the AutoDoc team**
