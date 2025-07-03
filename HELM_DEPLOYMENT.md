# GenUI Playground - Helm Chart Deployment Guide

This guide covers how to deploy the GenUI Playground application to Kubernetes using Helm charts.

## Overview

The GenUI Playground consists of two main components:
- **Frontend**: Next.js application with CopilotKit integration (port 3000)
- **Agent**: Python FastAPI backend with LangGraph and LangChain (port 8000)

## Prerequisites

Before deploying, ensure you have:

1. **Kubernetes cluster** (local or cloud)
2. **Helm 3.x** installed
3. **kubectl** configured to access your cluster
4. **Docker** for building images
5. **Container registry** access (for production deployments)

## Quick Start

### 1. Build Docker Images

Build both frontend and agent images:

```bash
# Build all images with default settings
./scripts/build-images.sh

# Build with custom registry and tag
IMAGE_REGISTRY=gcr.io/my-project IMAGE_TAG=v1.0.0 ./scripts/build-images.sh

# Build only frontend
BUILD_AGENT=false ./scripts/build-images.sh

# Build only agent
BUILD_FRONTEND=false ./scripts/build-images.sh
```

### 2. Deploy to Development

```bash
# Deploy to development environment
./scripts/deploy.sh -e dev

# Deploy with custom image tag
./scripts/deploy.sh -e dev -t v1.0.0

# Dry run to see what would be deployed
./scripts/deploy.sh -e dev --dry-run
```

### 3. Deploy to Production

```bash
# Deploy to production environment
./scripts/deploy.sh -e prod --registry gcr.io/my-project -t v1.0.0

# Upgrade existing production deployment
./scripts/deploy.sh -e prod --upgrade -t v1.0.1
```

## Manual Deployment

You can also deploy manually using Helm commands:

```bash
# Install with default values
helm install genui-playground ./helm

# Install with development values
helm install genui-playground ./helm -f helm/values-dev.yaml

# Install with production values and custom registry
helm install genui-playground ./helm \
  -f helm/values-prod.yaml \
  --set global.imageRegistry=gcr.io/my-project \
  --set frontend.image.tag=v1.0.0 \
  --set agent.image.tag=v1.0.0

# Upgrade existing deployment
helm upgrade genui-playground ./helm -f helm/values-prod.yaml
```

## Environment Configurations

### Development (`values-dev.yaml`)
- Single replica for both services
- Lower resource limits
- Debug logging enabled
- Local ingress host: `genui-playground.dev.local`
- No autoscaling

### Production (`values-prod.yaml`)
- Multiple replicas (3 frontend, 2 agent)
- Higher resource limits
- Production logging
- SSL/TLS enabled
- Autoscaling enabled (2-10 replicas)
- Secret management for API keys

## Configuration

### Environment Variables

Configure application environment variables in the values files:

```yaml
# Frontend environment variables
frontend:
  env:
    - name: NEXT_PUBLIC_API_URL
      value: "https://api.genui-playground.com"
    - name: NODE_ENV
      value: "production"

# Agent environment variables
agent:
  env:
    - name: OPENAI_API_KEY
      valueFrom:
        secretKeyRef:
          name: genui-playground-secrets
          key: openai-api-key
```

### Secrets Management

For production, create secrets for API keys:

```bash
# Create secrets manually
kubectl create secret generic genui-playground-secrets \
  --from-literal=openai-api-key=your-openai-key \
  --from-literal=anthropic-api-key=your-anthropic-key \
  -n genui-playground

# Or base64 encode and add to values-prod.yaml
echo -n "your-openai-key" | base64
```

### Resource Configuration

Adjust resources based on your cluster capacity:

```yaml
frontend:
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi

agent:
  resources:
    limits:
      cpu: 2000m
      memory: 2Gi
    requests:
      cpu: 1000m
      memory: 1Gi
```

## Ingress Configuration

### Development
```yaml
ingress:
  hosts:
    - host: genui-playground.dev.local
      paths:
        - path: /
          service: frontend
        - path: /copilotkit
          service: agent
```

### Production with SSL
```yaml
ingress:
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: genui-playground.com
      paths:
        - path: /
          service: frontend
        - path: /copilotkit
          service: agent
  tls:
    - secretName: genui-playground-tls
      hosts:
        - genui-playground.com
```

## Monitoring and Troubleshooting

### Check Deployment Status

```bash
# Check all resources
kubectl get all -n genui-playground

# Check pods
kubectl get pods -n genui-playground

# Check services
kubectl get services -n genui-playground

# Check ingress
kubectl get ingress -n genui-playground
```

### View Logs

```bash
# Frontend logs
kubectl logs -f deployment/genui-playground-frontend -n genui-playground

# Agent logs
kubectl logs -f deployment/genui-playground-agent -n genui-playground

# All logs with labels
kubectl logs -f -l app.kubernetes.io/name=genui-playground -n genui-playground
```

### Port Forwarding for Local Access

```bash
# Access frontend locally
kubectl port-forward service/genui-playground-frontend 3000:3000 -n genui-playground

# Access agent locally
kubectl port-forward service/genui-playground-agent 8000:8000 -n genui-playground
```

### Common Issues

1. **Images not found**: Ensure images are built and pushed to the correct registry
2. **Ingress not working**: Check ingress controller is installed and configured
3. **Agent startup slow**: Increase readiness probe initial delay
4. **Out of resources**: Adjust resource requests/limits

## Autoscaling

Enable horizontal pod autoscaling:

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80
```

Monitor autoscaling:

```bash
# Check HPA status
kubectl get hpa -n genui-playground

# Describe HPA for details
kubectl describe hpa genui-playground-frontend -n genui-playground
```

## Cleanup

### Uninstall Deployment

```bash
# Using the script
./scripts/deploy.sh --uninstall

# Using Helm directly
helm uninstall genui-playground -n genui-playground

# Delete namespace (optional)
kubectl delete namespace genui-playground
```

## Advanced Configuration

### Custom Values File

Create your own values file for specific environments:

```bash
# Copy and modify
cp helm/values-prod.yaml helm/values-staging.yaml

# Deploy with custom values
helm install genui-playground ./helm -f helm/values-staging.yaml
```

### Multiple Environments

Deploy multiple environments in different namespaces:

```bash
# Development
./scripts/deploy.sh -e dev -n genui-dev

# Staging
./scripts/deploy.sh -e prod -n genui-staging -r genui-staging

# Production
./scripts/deploy.sh -e prod -n genui-prod -r genui-prod
```

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Deploy to Kubernetes
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Images
        run: |
          IMAGE_REGISTRY=gcr.io/my-project \
          IMAGE_TAG=${{ github.sha }} \
          ./scripts/build-images.sh
          
      - name: Deploy to Production
        run: |
          ./scripts/deploy.sh \
            -e prod \
            --registry gcr.io/my-project \
            -t ${{ github.sha }} \
            --upgrade
```

## Support

For issues and questions:
- Check the Kubernetes events: `kubectl get events -n genui-playground`
- Review pod logs for error messages
- Ensure all prerequisites are met
- Verify cluster resources are sufficient

## File Structure

```
helm/
├── Chart.yaml                 # Helm chart metadata
├── values.yaml               # Default configuration values
├── values-dev.yaml           # Development environment values
├── values-prod.yaml          # Production environment values
├── .helmignore              # Files to ignore in chart package
└── templates/
    ├── _helpers.tpl         # Template helpers
    ├── frontend-deployment.yaml
    ├── frontend-service.yaml
    ├── agent-deployment.yaml
    ├── agent-service.yaml
    ├── ingress.yaml
    ├── serviceaccount.yaml
    ├── configmap.yaml
    ├── secret.yaml
    └── hpa.yaml

scripts/
├── build-images.sh          # Docker image build script
└── deploy.sh               # Helm deployment script

frontend/
└── Dockerfile              # Frontend container image

agent/
└── Dockerfile              # Agent container image
```