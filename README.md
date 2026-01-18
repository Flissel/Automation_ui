# Trusted Login System

🔐 **A secure and user-friendly login system with desktop integration and workflow automation**

---

## 🌍 Documentation

<!-- Note: German documentation has been removed. Please use the English documentation below. -->

### 🇬🇧 English Documentation

📖 **[Complete English Documentation](docs/en/README.md)**

**Quick Access:**
- 🏗️ [Architecture](docs/en/architecture/) - System architecture and technical documentation
- 👨‍💻 [Development](docs/en/development/) - Developer onboarding and testing
- ⚙️ [Operations](docs/en/operations/) - Deployment and maintenance
- 🔒 [Security](docs/en/security/) - Security policies and error handling
- 🔗 [Integration](docs/en/integration/) - API documentation and integration guides
- 👤 [User](docs/en/user/) - User manual and guides

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Python 3.9+
- PostgreSQL 14+
- Docker (optional)

### Installation & Setup

```bash
# Clone repository / Repository klonen
git clone <repository-url>
cd trusted-login-system

# Install dependencies / Abhängigkeiten installieren
npm install
cd backend && pip install -r requirements.txt

# Setup environment / Umgebung einrichten
cp .env.example .env
# Edit .env with your configuration / .env mit Ihrer Konfiguration bearbeiten

# Start development servers / Entwicklungsserver starten
npm run dev        # Frontend
npm run dev:backend # Backend
```

### Vector Database (Qdrant)

```
docker compose -f docker-compose.qdrant.yml up -d
```

- Exposes the HTTP API on `http://localhost:6333`
- Persists data inside the `qdrant_storage` Docker volume
- Stop it with `docker compose -f docker-compose.qdrant.yml down`

### Additional Information

- 📚 **[Startup Guide](STARTUP_GUIDE.md)** - Detaillierte Installationsanleitung
- 🔧 **[Development Setup](docs/en/development/developer_onboarding.md)** - Entwicklungsumgebung einrichten
- 🐳 **[Deployment Guide](docs/en/operations/deployment_guide.md)** - Container-basierte Entwicklung
- 🖥️ **[Live Desktop OCR + AutoGen](docs/LIVE_DESKTOP_OCR_QUICKSTART.md)** - 🆕 Screen-Capture mit KI-Analyse

---

## 🎯 Project Overview



The Trusted Login System is a modern, secure authentication solution with advanced desktop integration capabilities. It provides:

- **🔐 Secure Authentication** - Multi-factor authentication and secure session management
- **🖥️ Desktop Integration** - Seamless integration with desktop applications
- **⚡ Workflow Automation** - Automated workflows and processes
- **📊 Monitoring & Analytics** - Comprehensive monitoring and reporting
- **🔧 API-First Design** - RESTful APIs for easy integration

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tool

### Backend
- **FastAPI** - High-performance Python web framework
- **PostgreSQL** - Robust relational database
- **Redis** - Caching and session storage
- **WebSockets** - Real-time communication

### DevOps
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **Prometheus** - Monitoring and metrics
- **Grafana** - Visualization and dashboards

---

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- 📧 **Email**: support@trusted-login-system.com
- 📖 **Wiki**: [Project Wiki](https://github.com/your-repo/wiki)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Made with ❤️ by the Trusted Login System Team**
