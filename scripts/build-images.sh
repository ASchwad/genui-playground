#!/bin/bash

# Build script for GenUI Playground Docker images
set -e

# Configuration
IMAGE_REGISTRY=${IMAGE_REGISTRY:-"localhost"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
BUILD_FRONTEND=${BUILD_FRONTEND:-"true"}
BUILD_AGENT=${BUILD_AGENT:-"true"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Building GenUI Playground Docker Images${NC}"
echo "Registry: $IMAGE_REGISTRY"
echo "Tag: $IMAGE_TAG"
echo ""

# Build frontend image
if [ "$BUILD_FRONTEND" = "true" ]; then
    echo -e "${YELLOW}🔨 Building frontend image...${NC}"
    cd frontend
    docker build -t ${IMAGE_REGISTRY}/genui-playground-frontend:${IMAGE_TAG} .
    echo -e "${GREEN}✅ Frontend image built successfully${NC}"
    cd ..
fi

# Build agent image
if [ "$BUILD_AGENT" = "true" ]; then
    echo -e "${YELLOW}🔨 Building agent image...${NC}"
    cd agent
    docker build -t ${IMAGE_REGISTRY}/genui-playground-agent:${IMAGE_TAG} .
    echo -e "${GREEN}✅ Agent image built successfully${NC}"
    cd ..
fi

echo ""
echo -e "${GREEN}🎉 All images built successfully!${NC}"
echo ""
echo "To push images to registry:"
echo "  docker push ${IMAGE_REGISTRY}/genui-playground-frontend:${IMAGE_TAG}"
echo "  docker push ${IMAGE_REGISTRY}/genui-playground-agent:${IMAGE_TAG}"
echo ""
echo "To deploy with Helm:"
echo "  helm install genui-playground ./helm --set global.imageRegistry=${IMAGE_REGISTRY} --set frontend.image.tag=${IMAGE_TAG} --set agent.image.tag=${IMAGE_TAG}"