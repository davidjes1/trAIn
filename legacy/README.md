# 🏃‍♂️ Garmin FIT File Parser & Training Dashboard

A comprehensive web application for parsing Garmin FIT files and analyzing training data with interactive dashboards and Google Sheets integration.

## ✨ Features

### 📁 FIT File Parser
- **Binary FIT File Processing**: Parse .fit files directly in the browser
- **Field Analysis**: Dynamic discovery of available data fields
- **JSON Export**: Export selected fields with metadata
- **Bulk Processing**: Handle multiple files simultaneously

### 📊 Training Dashboard
- **Interactive Charts**: HR trends, training load, zone distribution
- **Status Panels**: Fatigue risk, readiness score, training streaks
- **Analytics**: TRIMP-based training load, HR drift analysis
- **Injury Prevention**: Automated risk factor detection
- **Google Sheets Integration**: Real-time data sync and visualization

## 🚀 Live Demo

- **GitHub Pages**: [your-username.github.io/trAIn](https://your-username.github.io/trAIn)
- **Full-Stack**: Deploy to Vercel/Netlify for complete functionality

## 🛠 Local Development

### Prerequisites
- Node.js 18+
- Google Cloud Project (for Sheets integration)
- Service Account JSON (for server-side auth)

### Quick Start
```bash
# Clone repository
git clone https://github.com/your-username/trAIn.git
cd trAIn

# Install dependencies
npm install

# Configure Google Sheets (optional)
cp google-sheets-config.example.json google-sheets-config.json
cp service-account.example.json service-account.json
# Edit files with your credentials

# Start development servers
npm start
# Frontend: http://localhost:3000
# API Server: http://localhost:3004
```

### Build for Production
```bash
npm run build
```

## 📊 Google Sheets Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google Sheets API

### 2. Create Service Account
1. Go to IAM & Admin > Service Accounts
2. Create service account with Sheets API access
3. Download JSON credentials file
4. Rename to `service-account.json`

### 3. Configure Spreadsheet
1. Create Google Sheets spreadsheet
2. Share with service account email (from JSON)
3. Copy spreadsheet ID from URL
4. Update `google-sheets-config.json`

## 🌐 Deployment Options

### Option 1: GitHub Pages (Frontend Only)
```bash
# Enable GitHub Pages in repository settings
# Push to main branch - GitHub Actions will deploy automatically
```

**Limitations**: 
- No Google Sheets server integration
- Dashboard will show demo data only
- File parsing and export work fully

### Option 2: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard:
# - Upload service-account.json content as GOOGLE_SERVICE_ACCOUNT
# - Set spreadsheet ID as GOOGLE_SHEETS_ID
```

### Option 3: Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Add environment variables in Netlify dashboard
```

### Option 4: Self-Hosted
```bash
# Build application
npm run build

# Start production server
npm run server &
npx serve dist -p 3000

# Or use PM2 for process management
npm i -g pm2
pm2 start ecosystem.config.js
```

## 📱 Mobile Support

The application is fully responsive and includes:
- **Progressive Web App** features
- **Capacitor integration** for native mobile apps
- **Touch-optimized** dashboard interface
- **Offline file parsing** capabilities

### Build Mobile App
```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios

# Build and sync
npm run build
npx cap add android
npx cap add ios
npx cap sync

# Open in native IDEs
npx cap open android
npx cap open ios
```

## 🏗 Architecture

### Frontend (Vite + TypeScript)
- **Parser**: FIT file processing with fit-file-parser
- **Dashboard**: Chart.js visualizations with real-time data
- **Services**: Modular architecture with caching
- **Styles**: SCSS with glass-morphism design

### Backend (Node.js + Express)
- **Google Sheets API**: Server-side authentication
- **RESTful API**: Clean endpoints for data operations
- **Error Handling**: Comprehensive error management
- **CORS**: Cross-origin request support

### Database (Google Sheets)
- **Training Log**: Activity metrics and analytics
- **Lap Splits**: Detailed lap-by-lap data
- **Auto-scaling**: No database maintenance required

## 🔧 Configuration

### Environment Variables
```bash
# Development
VITE_API_URL=http://localhost:3004

# Production
VITE_API_URL=https://your-domain.com
GOOGLE_SERVICE_ACCOUNT={"type":"service_account"...}
GOOGLE_SHEETS_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
```

### Google Sheets Structure
```
Training Log Sheet:
Date | Sport | Duration | Distance | Avg HR | Max HR | Zone1-5 | Training Load | Calories | Ascent | Notes

Lap Splits Sheet:
Date | Activity ID | Lap # | Duration | Distance | Avg HR | Avg Pace | Elevation Gain
```

## 📊 Training Metrics

### Calculations
- **Training Load**: TRIMP formula with exponential HR weighting
- **Readiness Score**: Multi-factor analysis (load, rest, HR drift)
- **Fatigue Risk**: Volume, intensity, and recovery analysis
- **HR Zones**: Configurable percentage-based zones

### Analytics
- **Trend Analysis**: Week-over-week progression tracking
- **Injury Prevention**: Automated risk factor identification
- **Performance Insights**: Zone distribution and efficiency metrics

## 🛡 Security

- **Client-side Processing**: FIT files never leave your browser
- **Service Account Auth**: Secure Google Sheets integration
- **No User Data Storage**: Privacy-first architecture
- **HTTPS Required**: Secure communication in production

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/trAIn/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/trAIn/discussions)
- **Email**: your-email@example.com

## 🙏 Acknowledgments

- **fit-file-parser**: FIT file parsing library
- **Chart.js**: Interactive data visualizations
- **Google Sheets API**: Cloud data storage
- **Vite**: Modern build tooling
- **TypeScript**: Type-safe development

---

**Made with ❤️ for the training data enthusiasts**