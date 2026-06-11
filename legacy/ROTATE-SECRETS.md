# Secret Rotation Instructions

## ✅ COMPLETED - Secret Rotation Done

~~Your Strava API secrets were accidentally committed to git history.~~ **This has been resolved!**

**Status**: New Strava client secret has been generated and configured.

## 1. ✅ Rotate Strava API Credentials - COMPLETED

1. ~~Go to [Strava API Settings](https://www.strava.com/settings/api)~~ ✅ Done
2. ~~**Regenerate your Client Secret** (this will invalidate the old one)~~ ✅ Done  
3. ~~Update your `.env` file with the new secret~~ ✅ Done

## 2. Update Environment Variables

If you're using any deployment platforms, update the secrets there too:
- **Netlify**: Site settings > Environment variables
- **Vercel**: Project settings > Environment Variables
- **GitHub Pages**: Repository Settings > Secrets and variables > Actions

## 3. Test the Application

```bash
npm run build
npm run dev
```

Verify that Strava authentication still works with the new credentials.

## 4. Optional: Clean Git History

If you want to remove the secrets from git history (advanced):

```bash
# ⚠️ WARNING: This will rewrite git history - use with caution
# Make sure to coordinate with any team members first

# Option 1: Use BFG Repo-Cleaner (recommended)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --replace-text passwords.txt

# Option 2: Use git filter-branch
git filter-branch --env-filter '
    if [ "$GIT_COMMIT" = "683d7ea" ] || [ "$GIT_COMMIT" = "57e81be" ]; then
        LANG=C LC_ALL=C sed -i "/clientSecret:/d" src/config/strava-config.ts
    fi
' -- --all

# After cleaning history:
git push --force-with-lease origin main
```

**Note**: Only do step 4 if this is a personal repository. For shared repositories, the security risk is already mitigated by rotating the secrets.

## 5. Verify Security

- ✅ Old secret is invalidated/rotated
- ✅ New secret is only in `.env` (not committed)  
- ✅ Application works with new credentials
- ✅ `.env` is in `.gitignore`

## Prevention

- Always use environment variables for secrets
- Never hardcode API keys in source code
- Use tools like [git-secrets](https://github.com/awslabs/git-secrets) to prevent commits with secrets
- Review code changes before committing