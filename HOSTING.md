# Nirali Saree hosting

The repository is ready for a Render Node web service. MongoDB Atlas stores
application data, ImageKit stores uploaded product images, and Nodemailer
sends account emails.

## Deploy on Render

1. Push this repository to GitHub.
2. In Render, choose **New > Blueprint** and select the repository.
3. Render detects `render.yaml`. Enter every environment value marked
   `sync: false`.
4. Set `ALLOWED_ORIGINS` and `PUBLIC_BASE_URL` to the Render URL initially,
   for example `https://nirali-saree.onrender.com`.
5. In MongoDB Atlas, allow connections from the hosting environment and use
   the Atlas connection string for `MONGO_URI`.
6. Deploy, then open `/health`. A successful deployment returns:
   `{"status":"ok","database":"connected"}`.

When a custom domain is connected, replace `ALLOWED_ORIGINS` and
`PUBLIC_BASE_URL` with its HTTPS address. Multiple allowed origins can be
comma-separated.

## Required secrets

- `MONGO_URI`
- `JWT_SECRET` (Render generates this when using the Blueprint)
- `EMAIL_USER`, `EMAIL_PASS`, and `EMAIL_FROM`
- `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, and
  `IMAGEKIT_URL_ENDPOINT`

Never commit the real `.env` file or paste secret values into `render.yaml`.
