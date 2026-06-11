# Security Configuration

## Environment Variables Setup

This application uses environment variables to securely store API keys and sensitive configuration data. **Never commit these secrets to git.**

### Setup Instructions

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your API keys in `.env`:**

   #### Firebase Configuration
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project or create a new one
   - Go to Project Settings > General > Your apps
   - Copy your Firebase config values into `.env`:
   ```
   VITE_FIREBASE_API_KEY=your-actual-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   # ... etc
   ```

   #### Strava API Configuration
   - Go to [Strava API Settings](https://www.strava.com/settings/api)
   - Create a new app or use an existing one
   - Copy your Client ID and Client Secret into `.env`:
   ```
   VITE_STRAVA_CLIENT_ID=your-client-id
   VITE_STRAVA_CLIENT_SECRET=your-client-secret
   ```

### Important Security Notes

- ✅ `.env` is already in `.gitignore` and won't be committed
- ✅ Use `.env.example` as a template for required variables
- ❌ **Never** hardcode secrets in source code
- ❌ **Never** commit `.env` files to git
- ❌ **Never** share your actual API keys publicly

### For Production Deployment

When deploying to platforms like Netlify, Vercel, or GitHub Pages:

1. **Set environment variables in your deployment platform:**
   - **Netlify**: Site settings > Environment variables
   - **Vercel**: Project settings > Environment Variables  
   - **GitHub Pages**: Repository Settings > Secrets and variables > Actions

2. **Use the same variable names** as defined in `.env.example`

### Git Security

If you accidentally committed secrets to git:

1. **Immediately rotate/regenerate** the exposed secrets
2. **Remove from git history** using tools like:
   ```bash
   git filter-branch --env-filter 'LANG=C LC_ALL=C sed -e "/VITE_STRAVA_CLIENT_SECRET=/d"' -- --all
   ```
   Or use [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

3. **Force push** to update remote repository:
   ```bash
   git push --force-with-lease origin main
   ```

### Local Development

The application will warn you if environment variables are missing:
- Check browser console for configuration warnings
- Ensure all required variables from `.env.example` are set in your `.env` file

## Questions?

If you're having trouble with configuration, check:
1. `.env` file exists and has the correct variable names
2. No extra spaces around the `=` signs
3. Values are properly quoted if they contain special characters
4. Browser dev tools console for specific error messages