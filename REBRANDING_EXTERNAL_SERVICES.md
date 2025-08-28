# External Services Requiring Manual Updates

## Summary
This document outlines external services that need manual configuration updates as part of the rebranding from "yourdai" to "YourMum".

## Services Requiring Manual Updates

### 1. Firebase Project
- **Current**: Project ID `yourdai`  
- **Required**: Create new Firebase project with ID `yourmum`
- **Action**: 
  ✅ Create new Firebase project in console
  - Update environment variables with new Firebase config
  - Migrate data if needed
  - Update GitHub Secrets: `FIREBASE_SERVICE_ACCOUNT_YOURMUM`

### 2. Domain Registration
- **Current**: `yourdai.app`
- **Required**: Register `yourmum.app`
- **Action**:
  ✅ Purchase domain `yourmum.app`
  ✅ Update DNS settings
  ✅ Configure SSL certificates
  - Update Firebase Hosting custom domain

### 3. Railway Deployment
- **Current**: `yourdai-production.up.railway.app`
- **Required**: `yourmum-production.up.railway.app`
- **Action**:
  - Update Railway project name/domain
  - Update environment variables
  - Update CORS configuration

### 4. Google Console (OAuth & APIs)
- **Current**: OAuth redirect URIs pointing to `yourdai.app`
- **Required**: Update to `yourmum.app`
- **Action**:
  ✅ Update OAuth 2.0 redirect URIs
  ✅ Update authorized JavaScript origins
  - Update Calendar API settings

### 5. Environment Variables
Update in production deployment:
- `APP_BASE_URL`: `https://yourdai.app` → `https://yourmum.app`
✅ `CORS_ALLOWED_ORIGINS`: Update domain references
- Firebase config values (API keys, auth domain, etc.)

### 6. GitHub Repository
- **Current**: Repository named with yourdai references
- **Required**: Consider renaming repository
- **Action**: Rename repository if desired

## Migration Checklist
- [✅] Register `yourmum.app` domain
- [✅] Create new Firebase project `yourmum`
- [ ] Update GitHub secrets
- [✅] Update Railway deployment settings
- [✅] Update Google Console OAuth settings
- [ ] Update production environment variables
- [ ] Test all integrations
- [✅] Update DNS settings
- [✅] Setup SSL certificates
- [ ] Verify all authentication flows work

## Notes
- Keep both domains running during transition period
- Test thoroughly in staging before switching production
- Update monitoring and analytics services
- Consider redirects from old domain to new domain