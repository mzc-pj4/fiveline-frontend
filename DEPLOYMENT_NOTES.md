# Deployment Notes

## What changed

- `src/api.ts` no longer hardcodes `localhost:8001/8002/8003`.
- The default API base URL is now empty, so existing calls such as `/api/products` become same-origin requests.
- This matches the target deployment:
  - CloudFront default behavior serves the S3 frontend.
  - CloudFront `/api/*` behavior forwards requests to the ALB Ingress in front of EKS.
- Local development can still override API hosts with Vite environment variables.
- The Dockerfile now uses `npm ci` and `package-lock.json` for reproducible frontend installs.

## Frontend environment variables

```text
VITE_API_BASE_URL=
VITE_USER_SERVICE_URL=http://localhost:8001
VITE_PRODUCT_SERVICE_URL=http://localhost:8002
VITE_ORDER_SERVICE_URL=http://localhost:8003
```

Use the service-specific variables only for local development. For S3 + CloudFront, keep them unset so the browser calls `/api/...` on the CloudFront domain.
The local Docker Compose file reads these service-specific variables from `.env` so `docker compose up` still talks to the local backend ports.
Use `.env.example` as the template:

```bash
cp .env.example .env
docker compose up --build
```

Do not commit `.env`; it is ignored because environment-specific values belong outside version control.

## Production build

```bash
npm ci
npm run build
```

Upload `dist/` to the frontend S3 bucket, then invalidate CloudFront.
