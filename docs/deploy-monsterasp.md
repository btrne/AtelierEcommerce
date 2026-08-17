# Atelier MonsterASP.NET Demo Deployment

This path is for a school/demo deployment when Azure is unavailable.

Architecture:

```text
Vercel customer app
Vercel admin app
        |
        v
Vercel rewrite /api/*
        |
        v
MonsterASP.NET Free: http://atelierapi.runasp.net
        |
        v
MonsterASP.NET MSSQL: db64085.databaseasp.net

Cloudinary stores uploaded images.
```

## 1. Monster resources

Created resources:

```text
Website: http://atelierapi.runasp.net
FTP server: site85625.siteasp.net
FTP login: site85625
FTP root: \wwwroot
Database server: db64085.databaseasp.net
Database: db64085
Database user: db64085
```

Keep the real passwords private.

## 2. Backend production settings

Copy this template:

```text
deploy/monsterasp-backend.appsettings.Production.example.json
```

Create this local-only file:

```text
deploy/monsterasp-backend.appsettings.Production.local.json
```

Fill in:

```text
ConnectionStrings.DefaultConnection
JwtSettings.SecretKey
Cloudinary.CloudName
Cloudinary.ApiKey
Cloudinary.ApiSecret
Cors.AllowedOrigins
Frontend.BaseUrl
```

Do not commit the `.local.json` file. It is ignored by git.

## 3. Create migration SQL

Generate an idempotent SQL script:

```powershell
.\scripts\deploy\create-migration-script.ps1
```

Apply it in MonsterASP.NET database manager, or connect with SQL Server Management Studio/Azure Data Studio:

```text
Server: db64085.databaseasp.net
Database: db64085
User: db64085
```

Run:

```text
deploy/sql/atelier-idempotent.sql
```

## 4. Publish backend package

Create the publish folder and zip:

```powershell
.\scripts\deploy\publish-monsterasp.ps1
```

Upload the contents of:

```text
deploy/publish/monsterasp-api
```

to MonsterASP.NET:

```text
\wwwroot
```

You can use WebFTP, FTP/SFTP, or WebDeploy. After upload, restart the site.

Check:

```http
http://atelierapi.runasp.net/health
```

Expected:

```json
{
  "status": "Healthy",
  "database": "Reachable"
}
```

## 5. Vercel environment variables

MonsterASP.NET Free uses HTTP, so the browser should not call it directly from Vercel HTTPS.
Use Vercel rewrites instead.

For both frontend projects:

```text
NEXT_PUBLIC_API_URL=/api
API_PROXY_ORIGIN=http://atelierapi.runasp.net
```

For customer:

```text
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_FACEBOOK_APP_ID=...
```

For admin:

```text
NEXT_PUBLIC_CUSTOMER_URL=https://<customer-project>.vercel.app
```

After Vercel gives the real URLs, update backend:

```json
"Cors": {
  "AllowedOrigins": [
    "https://<customer-project>.vercel.app",
    "https://<admin-project>.vercel.app"
  ]
},
"Frontend": {
  "BaseUrl": "https://<customer-project>.vercel.app"
}
```

Republish or reupload `appsettings.Production.json`, then restart the MonsterASP.NET site.

## 6. Demo smoke test

Before presenting:

```text
1. Open http://atelierapi.runasp.net/health.
2. Open customer Vercel URL.
3. Register/login.
4. Browse products.
5. Add to cart.
6. Checkout COD.
7. Upload an image.
8. Open admin Vercel URL.
9. Login as admin.
10. Check product/order screens.
```
