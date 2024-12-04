#!/bin/bash

# Apply all Kubernetes manifests
echo "Deploying LemonStand to Kubernetes..."

# Create namespace
kubectl apply -f manifests/namespace.yaml

# Apply config maps and secrets
kubectl apply -f configs/configmap.yaml
kubectl apply -f configs/secret.yaml

# Apply infrastructure
kubectl apply -f manifests/mongodb.yaml
kubectl apply -f manifests/redis.yaml
kubectl apply -f manifests/rabbitmq.yaml

# Apply services
kubectl apply -f manifests/api-gateway.yaml
kubectl apply -f manifests/auth-service.yaml
kubectl apply -f manifests/products-service.yaml
kubectl apply -f manifests/orders-service.yaml
kubectl apply -f manifests/payments-service.yaml
kubectl apply -f manifests/email-service.yaml
kubectl apply -f manifests/service-registry.yaml

# Apply ingress
kubectl apply -f manifests/ingress.yaml

echo "Deployment complete!"
echo "Add '127.0.0.1 lemonstand.local' to your /etc/hosts file"
echo "Access the application at: http://lemonstand.local"
