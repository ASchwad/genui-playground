#!/bin/bash

# Deployment script for GenUI Playground using Helm
set -e

# Configuration
ENVIRONMENT=${ENVIRONMENT:-"dev"}
NAMESPACE=${NAMESPACE:-"genui-playground"}
RELEASE_NAME=${RELEASE_NAME:-"genui-playground"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
IMAGE_REGISTRY=${IMAGE_REGISTRY:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment    Environment (dev, staging, prod) [default: dev]"
    echo "  -n, --namespace      Kubernetes namespace [default: genui-playground]"
    echo "  -r, --release        Helm release name [default: genui-playground]"
    echo "  -t, --tag           Image tag [default: latest]"
    echo "  --registry          Image registry URL"
    echo "  --dry-run           Perform a dry run"
    echo "  --upgrade           Upgrade existing release"
    echo "  --uninstall         Uninstall the release"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e dev -t v1.0.0"
    echo "  $0 -e prod --registry gcr.io/my-project --upgrade"
    echo "  $0 --uninstall"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -r|--release)
            RELEASE_NAME="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --registry)
            IMAGE_REGISTRY="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="--dry-run"
            shift
            ;;
        --upgrade)
            UPGRADE="true"
            shift
            ;;
        --uninstall)
            UNINSTALL="true"
            shift
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            print_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo "Valid environments: dev, staging, prod"
    exit 1
fi

echo -e "${BLUE}🚀 GenUI Playground Deployment${NC}"
echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"
echo "Release: $RELEASE_NAME"
echo "Image Tag: $IMAGE_TAG"
if [[ -n "$IMAGE_REGISTRY" ]]; then
    echo "Registry: $IMAGE_REGISTRY"
fi
echo ""

# Handle uninstall
if [[ "$UNINSTALL" == "true" ]]; then
    echo -e "${YELLOW}🗑️  Uninstalling release...${NC}"
    helm uninstall $RELEASE_NAME -n $NAMESPACE || true
    echo -e "${GREEN}✅ Release uninstalled${NC}"
    exit 0
fi

# Create namespace if it doesn't exist
echo -e "${YELLOW}📁 Creating namespace if needed...${NC}"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Prepare Helm command
HELM_CMD="helm"
VALUES_FILE="helm/values-${ENVIRONMENT}.yaml"

if [[ "$UPGRADE" == "true" ]]; then
    HELM_CMD="$HELM_CMD upgrade"
else
    HELM_CMD="$HELM_CMD install"
fi

HELM_CMD="$HELM_CMD $RELEASE_NAME ./helm"
HELM_CMD="$HELM_CMD --namespace $NAMESPACE"
HELM_CMD="$HELM_CMD --values $VALUES_FILE"

# Add image configuration
if [[ -n "$IMAGE_REGISTRY" ]]; then
    HELM_CMD="$HELM_CMD --set global.imageRegistry=$IMAGE_REGISTRY"
fi
HELM_CMD="$HELM_CMD --set frontend.image.tag=$IMAGE_TAG"
HELM_CMD="$HELM_CMD --set agent.image.tag=$IMAGE_TAG"

# Add dry-run if specified
if [[ -n "$DRY_RUN" ]]; then
    HELM_CMD="$HELM_CMD $DRY_RUN"
fi

# Check if values file exists
if [[ ! -f "$VALUES_FILE" ]]; then
    echo -e "${RED}❌ Values file not found: $VALUES_FILE${NC}"
    exit 1
fi

# Execute Helm command
echo -e "${YELLOW}⚙️  Deploying with Helm...${NC}"
echo "Command: $HELM_CMD"
echo ""

eval $HELM_CMD

if [[ -z "$DRY_RUN" ]]; then
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Useful commands:${NC}"
    echo "  Check pods: kubectl get pods -n $NAMESPACE"
    echo "  Check services: kubectl get services -n $NAMESPACE"
    echo "  Check ingress: kubectl get ingress -n $NAMESPACE"
    echo "  View logs: kubectl logs -f deployment/${RELEASE_NAME}-frontend -n $NAMESPACE"
    echo "  Port forward: kubectl port-forward service/${RELEASE_NAME}-frontend 3000:3000 -n $NAMESPACE"
else
    echo ""
    echo -e "${YELLOW}🧪 Dry run completed${NC}"
fi