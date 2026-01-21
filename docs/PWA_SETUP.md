# Progressive Web App (PWA) Setup

The Growth Companion app is now a Progressive Web App (PWA) that can be installed on mobile devices and desktops.

## Features

- ✅ **Installable**: Can be installed on iOS, Android, and desktop
- ✅ **Offline Support**: Basic offline functionality with service worker
- ✅ **App-like Experience**: Standalone display mode (no browser UI)
- ✅ **Fast Loading**: Cached resources for faster load times
- ✅ **Install Prompt**: Automatic prompt to install the app

## Installation Instructions

### Android/Chrome

1. Open the app in Chrome browser
2. You'll see an install prompt (or tap the menu → "Install app")
3. Tap "Install" to add to home screen
4. The app will open in standalone mode

### iOS/Safari

1. Open the app in Safari browser
2. Tap the Share button (□↑ icon)
3. Scroll down and tap "Add to Home Screen"
4. Customize the name if desired
5. Tap "Add"
6. The app icon will appear on your home screen

### Desktop (Chrome/Edge)

1. Open the app in Chrome or Edge
2. Look for the install icon in the address bar (or menu → "Install Companion")
3. Click "Install"
4. The app will open in a standalone window

## How It Works

### Service Worker
- Caches static assets for offline access
- Provides faster loading on repeat visits
- Automatically updates when new version is available

### Web App Manifest
- Defines app name, icons, colors, and display mode
- Enables "Add to Home Screen" functionality
- Provides app shortcuts for quick access

### Install Prompt
- Automatically shows on supported browsers
- Can be dismissed and won't show again
- Provides iOS-specific instructions for Safari

## Testing PWA Features

### Local Development
1. Build the app: `pnpm build`
2. Start production server: `pnpm start`
3. Open in browser (HTTPS required for service worker)
4. Check browser DevTools → Application → Service Workers

### Production Testing
1. Deploy to Vercel (HTTPS is automatic)
2. Open on mobile device
3. Test install prompt
4. Test offline functionality
5. Verify app shortcuts work

## Troubleshooting

### Service Worker Not Registering
- Ensure you're using HTTPS (required for service workers)
- Check browser console for errors
- Clear browser cache and reload

### Install Prompt Not Showing
- Check if app is already installed
- Verify manifest.json is accessible
- Check browser compatibility (Chrome, Edge, Safari)

### Offline Mode Not Working
- Service worker only caches static assets
- API calls still require network connection
- Some features may be limited offline

## Files Added

- `public/manifest.json` - Web app manifest
- `public/sw.js` - Service worker script
- `app/sw.js/route.ts` - Service worker route handler
- `app/manifest.json/route.ts` - Manifest route handler
- `components/pwa-register.tsx` - Service worker registration
- `components/pwa-install-prompt.tsx` - Install prompt component

## Browser Support

- ✅ Chrome/Edge (Android & Desktop)
- ✅ Safari (iOS)
- ✅ Firefox (limited)
- ⚠️ Older browsers may have limited support

## Next Steps (Optional Enhancements)

- Push notifications
- Background sync
- Advanced offline data caching
- App updates notification

---

**Status**: ✅ PWA Setup Complete - Ready for Mobile Installation
