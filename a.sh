export GIT_AUTHOR_DATE="$(date -d '2024-12-04 14:27:38')"
export GIT_COMMITTER_DATE="$GIT_AUTHOR_DATE"

# Create Kubernetes deployment files
cd lemonstand-platform
mkdir -p k8s/{manifests,configs}

# Create namespace
cat > k8s/manifests/namespace.yaml << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: lemonstand
  labels:
    name: lemonstand
EOF

# Create MongoDB deployment
cat > k8s/manifests/mongodb.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
  namespace: lemonstand
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:5
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_DATABASE
          value: "lemonstand"
        volumeMounts:
        - name: mongodb-data
          mountPath: /data/db
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: mongodb-data
        persistentVolumeClaim:
          claimName: mongodb-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: lemonstand
spec:
  selector:
    app: mongodb
  ports:
  - port: 27017
    targetPort: 27017
  clusterIP: None
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongodb-pvc
  namespace: lemonstand
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
EOF

# Create Redis deployment
cat > k8s/manifests/redis.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: lemonstand
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:6-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "250m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: lemonstand
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
EOF

# Create RabbitMQ deployment
cat > k8s/manifests/rabbitmq.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rabbitmq
  namespace: lemonstand
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
      - name: rabbitmq
        image: rabbitmq:3-management
        ports:
        - containerPort: 5672
          name: amqp
        - containerPort: 15672
          name: management
        env:
        - name: RABBITMQ_DEFAULT_USER
          value: "admin"
        - name: RABBITMQ_DEFAULT_PASS
          value: "password"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq
  namespace: lemonstand
spec:
  selector:
    app: rabbitmq
  ports:
  - port: 5672
    targetPort: 5672
    name: amqp
  - port: 15672
    targetPort: 15672
    name: management
EOF

# Create config maps for environment variables
cat > k8s/configs/configmap.yaml << 'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: lemonstand-config
  namespace: lemonstand
data:
  NODE_ENV: "production"
  JWT_SECRET: "your_jwt_secret_here"
  JWT_EXPIRES_IN: "90d"
  STRIPE_SECRET_KEY: "your_stripe_secret_key_here"
  STRIPE_WEBHOOK_SECRET: "your_stripe_webhook_secret_here"
  REDIS_URL: "redis://redis:6379"
  RABBITMQ_URL: "amqp://rabbitmq:5672"
  REGISTRY_URL: "http://service-registry:3006"
EOF

# Create secret for sensitive data
cat > k8s/configs/secret.yaml << 'EOF'
apiVersion: v1
kind: Secret
metadata:
  name: lemonstand-secrets
  namespace: lemonstand
type: Opaque
data:
  EMAIL_USERNAME: "base64_encoded_email_username"
  EMAIL_PASSWORD: "base64_encoded_email_password"
  MONGODB_URI: "bW9uZ29kYjovL21vbmdvZGI6MjcwMTcvbGVtb25zdGFuZA==" # mongodb://mongodb:27017/lemonstand
EOF

# Create service deployment template
cat > k8s/manifests/service-template.yaml << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: SERVICE_NAME
  namespace: lemonstand
spec:
  replicas: 2
  selector:
    matchLabels:
      app: SERVICE_NAME
  template:
    metadata:
      labels:
        app: SERVICE_NAME
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
    spec:
      containers:
      - name: SERVICE_NAME
        image: IMAGE_NAME
        ports:
        - containerPort: PORT
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: lemonstand-config
              key: NODE_ENV
        - name: JWT_SECRET
          valueFrom:
            configMapKeyRef:
              name: lemonstand-config
              key: JWT_SECRET
        - name: JWT_EXPIRES_IN
          valueFrom:
            configMapKeyRef:
              name: lemonstand-config
              key: JWT_EXPIRES_IN
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: lemonstand-config
              key: REDIS_URL
        - name: RABBITMQ_URL
          valueFrom:
            configMapKeyRef:
              name: lemonstand-config
              key: RABBITMQ_URL
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: lemonstand-secrets
              key: MONGODB_URI
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /health
            port: PORT
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: PORT
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: SERVICE_NAME
  namespace: lemonstand
spec:
  selector:
    app: SERVICE_NAME
  ports:
  - port: PORT
    targetPort: PORT
EOF

# Create individual service deployments
services=(
  "api-gateway:3000"
  "auth-service:3001" 
  "products-service:3002"
  "orders-service:3003"
  "payments-service:3004"
  "email-service:3005"
  "service-registry:3006"
)

for service in "${services[@]}"; do
  IFS=':' read -r name port <<< "$service"
  cat > k8s/manifests/${name}.yaml << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: lemonstand
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ${name}
  template:
    metadata:
      labels:
        app: ${name}
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "${port}"
    spec:
      containers:
      - name: ${name}
        image: lemonstand/${name}:latest
        ports:
        - containerPort: ${port}
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: lemonstand-config
              key: NODE_ENV
        - name: JWT_SECRET
          valueFrom:
            configMapKeyRef:
              name: lemonstand-config
              key: JWT_SECRET
        - name: JWT_EXPIRES_IN
          valueFrom:
            configMapKeyRef:
              name: lemonstand-config
              key: JWT_EXPIRES_IN
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: lemonstand-config
              key: REDIS_URL
        - name: RABBITMQ_URL
          valueFrom:
            configMapKeyRef:
              name: lemonstand-config
              key: RABBITMQ_URL
        - name: REGISTRY_URL
          valueFrom:
            configMapKeyRef:
              name: lemonstand-config
              key: REGISTRY_URL
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: lemonstand-secrets
              key: MONGODB_URI
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /health
            port: ${port}
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: ${port}
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ${name}
  namespace: lemonstand
spec:
  selector:
    app: ${name}
  ports:
  - port: ${port}
    targetPort: ${port}
EOF
done

# Create ingress
cat > k8s/manifests/ingress.yaml << 'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: lemonstand-ingress
  namespace: lemonstand
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  rules:
  - host: lemonstand.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 3000
      - path: /metrics
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 3000
EOF

# Create deployment script
cat > k8s/deploy.sh << 'EOF'
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
EOF

chmod +x k8s/deploy.sh

git add .
git commit -m "devops: add Kubernetes deployment files and scripts for production"

unset GIT_AUTHOR_DATE
unset GIT_COMMITTER_DATE