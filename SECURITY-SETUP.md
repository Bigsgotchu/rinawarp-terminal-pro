# 🔒 RinaWarp Terminal Security Setup Guide

This guide walks you through setting up and testing the enterprise-grade security features integrated into RinaWarp Terminal.

## 📋 Prerequisites

- Node.js 18+ installed
- All dependencies installed (`npm install`)
- Environment variables configured

## 🔑 Environment Variables Setup

### 1. **JWT and API Security** (Already configured in .env)
```bash
JWT_SECRET=Uc8SuNeK4T5aAjPS/2Lz+9W4gULNODTH8V91eqw3LFP42mZo45ytKdixr4/hTrtsYD++Ic9hNOmlVEGs3TnZqw==
API_KEY_SECRET=7j58NACBeXFL6z6nWx4/acNbYo3t7BafltGIa9sUquE=
```

### 2. **Admin Configuration**
Generate a secure admin password hash:
```bash
node generate-admin-hash.js
```

Then update your `.env` file:
```bash
ADMIN_EMAIL=admin@rinawarptech.com
ADMIN_PASSWORD_HASH=<generated_hash_from_above>
```

### 3. **Railway Environment Variables**
For production deployment on Railway, add these environment variables:
- `JWT_SECRET`
- `API_KEY_SECRET` 
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`

## 🚀 Starting the Server

1. **Development Mode:**
```bash
npm run dev
```

2. **Production Mode:**
```bash
npm start
```

The server will start with all security features enabled.

## 🧪 Testing Security Features

### Automated Testing
Run the comprehensive security test suite:
```bash
node test-security.js
```

This will test:
- ✅ Unauthenticated access protection
- ✅ JWT token generation
- ✅ Authenticated access
- ✅ Role-based access control
- ✅ Secrets management
- ✅ Rate limiting

### Manual Testing

#### 1. **Generate JWT Tokens**
```bash
curl -X POST http://localhost:3000/api/auth/generate-token \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "admin-1",
    "email": "admin@rinawarptech.com", 
    "role": "ADMIN",
    "permissions": ["admin:read", "admin:write", "secrets:manage"]
  }'
```

#### 2. **Access Admin Dashboard** 
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/admin/dashboard
```

#### 3. **Test Protected License Generation**
```bash
curl -X POST http://localhost:3000/api/generate-license \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "test-123",
    "licenseType": "personal",
    "email": "test@example.com"
  }'
```

#### 4. **Test Secrets Management**
Store a secret:
```bash
curl -X POST http://localhost:3000/api/admin/secrets \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "test-secret",
    "value": "secret-value",
    "service": "testing"
  }'
```

Retrieve a secret:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/admin/secrets/test-secret
```

## 🔐 Security Features Overview

### 1. **JWT Authentication**
- Secure token-based authentication
- Configurable expiration times
- Role and permission embedding

### 2. **Role-Based Access Control (RBAC)**
- **USER**: Basic access to user endpoints
- **ADMIN**: Access to admin dashboard and management
- **SUPER_ADMIN**: Full system access

### 3. **Permission-Based Access**
Fine-grained permissions:
- `admin:read` - Read admin data
- `admin:write` - Modify admin data  
- `secrets:manage` - Manage secrets
- `licenses:generate` - Generate licenses

### 4. **Secrets Management**
- Encrypted storage of sensitive data
- Service-specific secret organization
- Secure retrieval and rotation

### 5. **Rate Limiting**
- Configurable limits per endpoint
- IP-based throttling
- Different limits for different security levels

### 6. **API Key Authentication**
Alternative authentication method for service-to-service communication.

## 🛡️ Security Best Practices

### Production Deployment
1. **Use strong, unique secrets** - Never use default values
2. **Enable HTTPS** - All communication should be encrypted
3. **Regular secret rotation** - Update JWT secrets periodically
4. **Monitor access logs** - Track authentication attempts
5. **Implement proper CORS** - Restrict allowed origins

### Access Control
1. **Principle of least privilege** - Give minimum required permissions
2. **Regular token expiration** - Use short-lived tokens when possible
3. **Audit admin actions** - Log all administrative operations
4. **Secure password policies** - Enforce strong passwords

## 🚨 Security Endpoints

### Public Endpoints (No Auth Required)
- `GET /api/ping` - Health check
- `GET /api/version` - Version info
- `GET /api/stripe-config` - Stripe public config
- `POST /api/capture-lead` - Lead capture
- `POST /api/track-conversion` - Analytics

### Protected Endpoints (JWT Required)
- `POST /api/generate-license` - License generation
- `GET /api/admin/*` - All admin routes
- `POST /api/admin/secrets` - Secret management

### Admin-Only Endpoints (Admin Role Required)
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/secrets` - List secrets
- `POST /api/admin/secrets` - Store secrets
- `GET /api/admin/secrets/:key` - Retrieve specific secret

## 🔍 Monitoring and Logging

The server logs all security-related events:
- Authentication attempts
- Authorization failures  
- Admin actions
- Rate limit violations
- Security header violations

## 🆘 Troubleshooting

### Common Issues

1. **"Access token required" error**
   - Ensure you're sending the `Authorization: Bearer <token>` header
   - Verify the JWT token is not expired

2. **"Insufficient permissions" error**
   - Check that your user role has the required permissions
   - Verify the token contains the correct role/permissions

3. **Rate limit exceeded**
   - Wait for the rate limit window to reset
   - Check if you're making too many requests

4. **Secrets not found**
   - Ensure secrets are properly stored with correct keys
   - Check that you have `secrets:manage` permission

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=true
LOG_LEVEL=debug
```

## 📞 Support

For security-related issues or questions:
- Email: security@rinawarptech.com
- Documentation: [Security Wiki](https://github.com/rinawarp/terminal/wiki/security)
- Issues: [GitHub Issues](https://github.com/rinawarp/terminal/issues)

---

**🔒 Security is paramount at RinaWarp. This implementation follows industry best practices and enterprise security standards.**
