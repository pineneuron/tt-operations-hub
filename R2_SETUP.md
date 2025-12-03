# Cloudflare R2 Setup Guide

This guide will help you set up Cloudflare R2 for image storage in the application.

## Why R2?

- **No egress fees**: Unlike AWS S3, R2 doesn't charge for data transfer
- **S3-compatible API**: Easy to use with existing AWS SDK
- **Low storage costs**: ~$0.015 per GB stored
- **Works with Vercel**: Perfect for serverless deployments

## Step 1: Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** in the sidebar
3. Click **Create bucket**
4. Enter a bucket name (e.g., `tt-operations-hub`)
5. Choose a location (closest to your users)
6. Click **Create bucket**

## Step 2: Create API Token

1. In R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API Token**
3. Set the following:
   - **Token name**: `tt-operations-hub-upload`
   - **Permissions**: `Object Read & Write`
   - **TTL**: Leave empty (no expiration) or set a date
4. Click **Create API Token**
5. **IMPORTANT**: Copy the **Access Key ID** and **Secret Access Key** immediately (you won't see the secret again)

## Step 3: Get R2 Endpoint

1. In R2 dashboard, go to your bucket
2. Click on **Settings** tab
3. Find **S3 API** section
4. Copy the **S3 API Endpoint** URL
   - Format: `https://<account-id>.r2.cloudflarestorage.com`

## Step 4: Set Up Public Access

You have two options:

### Option A: Use R2.dev Subdomain (Easiest)

1. In your bucket settings, go to **Public Access**
2. Click **Connect Domain**
3. Select **R2.dev subdomain**
4. Cloudflare will generate a subdomain like `https://pub-xxxxx.r2.dev`
5. Copy this URL

### Option B: Use Custom Domain (Recommended for Production)

1. In your bucket settings, go to **Public Access**
2. Click **Connect Domain**
3. Enter your custom domain (e.g., `cdn.yourdomain.com`)
4. Follow the DNS setup instructions
5. Wait for DNS propagation (usually a few minutes)
6. Copy your custom domain URL

## Step 5: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# R2 Endpoint URL
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com

# R2 Access Key ID (from API token)
R2_ACCESS_KEY_ID=your-access-key-id

# R2 Secret Access Key (from API token)
R2_SECRET_ACCESS_KEY=your-secret-access-key

# R2 Bucket Name
R2_BUCKET_NAME=tt-operations-hub

# R2 Public URL (from Step 4)
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
# OR if using custom domain:
# R2_PUBLIC_URL=https://cdn.yourdomain.com
```

## Step 6: Update Next.js Image Config (If Using Custom Domain)

If you're using a custom domain (not `*.r2.dev`), you need to add it to `next.config.ts`:

```typescript
images: {
  remotePatterns: [
    // ... existing patterns
    {
      protocol: 'https',
      hostname: 'cdn.yourdomain.com',
      port: ''
    }
  ]
}
```

## Step 7: Test the Setup

1. Start your development server: `pnpm dev`
2. Try uploading an image through the event modal
3. Check your R2 bucket to verify the file was uploaded
4. Verify the image displays correctly in the application

## Troubleshooting

### Error: "R2 storage is not configured"
- Make sure all environment variables are set in `.env.local`
- Restart your development server after adding env vars

### Error: "Failed to upload file to R2"
- Verify your API token has `Object Read & Write` permissions
- Check that `R2_ENDPOINT` is correct
- Ensure `R2_BUCKET_NAME` matches your bucket name exactly

### Images not displaying
- Check that `R2_PUBLIC_URL` is correct
- Verify public access is enabled on your bucket
- If using custom domain, ensure DNS is configured correctly
- Check browser console for CORS errors (R2 should handle this automatically)

### CORS Issues
- R2 handles CORS automatically for public buckets
- If you see CORS errors, check your bucket's public access settings

## Cost Estimation

For a typical application:
- **Storage**: ~100 images × 500KB = 50MB = $0.00075/month
- **Egress**: Free (unlimited)
- **Operations**: First 1M operations free, then $4.50 per million

**Total**: Essentially free for small to medium applications!

## Security Best Practices

1. **Never commit API tokens** to version control
2. **Use environment variables** for all R2 credentials
3. **Rotate API tokens** periodically
4. **Use least privilege**: Only grant `Object Read & Write` permissions
5. **Enable bucket versioning** for production (optional but recommended)

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [S3-Compatible API Reference](https://developers.cloudflare.com/r2/api/s3/api/)

