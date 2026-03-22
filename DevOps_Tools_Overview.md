# Ambieye Project Overview & DevOps Strategy

## About Ambieye
Ambieye is a healthcare platform connecting patients and doctors through an integrated mobile application. The platform enables patient care management, query resolution, and interactive health engagement features like therapeutic games. The system handles patient profiles, doctor consultations, medical data, and communication between healthcare providers and patients.

## Current Architecture

### Mobile Application
The mobile front-end is a cross-platform application built for both iOS and Android, delivering native-like performance while maintaining a single codebase. Users access the platform through either patient or doctor roles, each with specialized features and interfaces.

### Backend Infrastructure

**PHP Backend (Port 5000)**
- RESTful API handling patient data, doctor management, queries, and authentication
- PHP 8.1 with FPM (FastCGI Process Manager) for efficient request processing
- Composer manages dependencies with PSR-4 autoloading across modules
- JWT-based authentication for secure API access
- Modular architecture supporting Config, Database, Authentication, and API layers

**MySQL Database (Port 3306)**
- Version 8.0 for relational data storage
- Persistent volume ensures data survival across container restarts
- Automated schema initialization on startup
- Handles patient records, doctor profiles, queries, and medical data

### Current DevOps Setup
Docker and Docker Compose manage the entire stack. Services communicate through a dedicated bridge network with health checks monitoring MySQL availability. Environment variables handle configuration management for credentials and connectivity.

---

## DevOps Tools Currently Implemented

### 1. Docker & Containerization
Packages the PHP backend with all dependencies in isolated containers, ensuring consistency from development through production. Health checks validate service readiness before handling traffic.

### 2. Docker Compose
Orchestrates the multi-container environment with MySQL and PHP services, managing networking, volumes, and startup dependencies automatically.

### 3. Composer
Handles PHP dependency management with production-optimized builds, ensuring reproducible deployments.

---

## Recommended DevOps Tools to Implement

### CI/CD Pipeline
- **GitHub Actions / GitLab CI:** Automate testing on every push, build Docker images, run security scans, and deploy to staging/production
- **Jenkins:** Self-hosted alternative for complex build workflows with custom triggers and notification systems

### Container Orchestration
- **Kubernetes:** Scale to multiple servers, manage rolling updates, self-heal failed containers, and handle load balancing automatically
- **Docker Swarm:** Simpler orchestration for smaller deployments without the complexity of Kubernetes

### Monitoring & Logging
- **Prometheus + Grafana:** Real-time metrics collection and visualization for API response times, database performance, and resource usage
- **ELK Stack (Elasticsearch, Logstash, Kibana):** Centralized logging from all containers for debugging and audit trails
- **Datadog / New Relic:** Cloud-based monitoring with alerting for production issues

### Database Management
- **Database Backups Automation:** Scheduled backup strategies with point-in-time recovery
- **Database Migration Tools:** Version control for schema changes (Flyway, Liquibase)
- **Read Replicas:** Distribute query load from the mobile app across multiple MySQL instances

### Load Balancing & Reverse Proxy
- **Nginx / HAProxy:** Distribute mobile app requests across multiple PHP backend instances
- **AWS Load Balancer / Google Cloud Load Balancer:** Managed load balancing for cloud deployments

### Infrastructure as Code
- **Terraform:** Version-control your infrastructure (servers, networks, databases)
- **Ansible:** Automate deployment configuration across multiple environments
- **CloudFormation (AWS) / Bicep (Azure):** Native IaC for cloud providers

### API & Performance
- **API Gateway:** Rate limiting, request authentication, version management
- **Caching Layer (Redis):** Reduce database load for frequently accessed data (patient profiles, doctor lists)
- **CDN:** Distribute static assets to mobile clients from geographically closer servers

### Security
- **Container Scanning:** Scan Docker images for vulnerabilities (Trivy, Grype)
- **SAST/DAST Tools:** Static and dynamic application security testing (SonarQube, OWASP ZAP)
- **Secret Management:** HashiCorp Vault or cloud provider secrets services for API keys and certificates

### Testing
- **Automated Testing:** Unit tests, integration tests, and API tests in CI/CD
- **Load Testing:** Simulate mobile app usage patterns (Apache JMeter, Locust) to verify backend capacity
- **Chaos Engineering:** Test system resilience under failure conditions

### Deployment Strategies
- **Blue-Green Deployment:** Zero-downtime updates by maintaining two production environments
- **Canary Releases:** Gradually roll out new versions to detect issues early
- **Feature Flags:** Toggle features on/off without redeployment

### Backup & Disaster Recovery
- **Automated Backups:** Daily MySQL snapshots with off-site replication
- **Disaster Recovery Plan:** RTO/RPO targets with tested recovery procedures
- **Database Replication:** Cross-region replication for business continuity

### Development Workflow
- **Local Development Stack:** Pre-configured development containers matching production (Makefile, shell scripts)
- **Environment Management:** Separate configs for dev, staging, and production
- **Version Control Strategy:** Git branching strategy (GitFlow, trunk-based) with protected main branches