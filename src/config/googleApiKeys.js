// Central place for Google API keys.
// Create TWO keys in Google Cloud:
// 1. ANDROID_SDK_KEY: Restrict by Android apps (package: com.sorita.mapapp + BOTH debug & release SHA‑1).
// 2. WEB_JS_KEY: For Google Maps JavaScript API + Places (initially UNRESTRICTED for testing, later restrict by HTTP referrer if you host content on the web; for WebView keep it unrestricted or treat it as web usage). 
// DO NOT mix Android app restriction with JavaScript (Web) usage.
// Replace the placeholder strings below with your real keys (do NOT commit real production keys to public repos).

// Android SDK Key (for native Android Maps SDK - not used currently)
export const ANDROID_SDK_KEY = 'AIzaSyBxgDpK3-dWsuXewlIWB68ubkuH4Q4eEB8';

// Web JavaScript Key (for Maps JavaScript API in WebView)
// IMPORTANT: This key should be UNRESTRICTED (no application restrictions) for WebView usage
const envWebKey = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_GOOGLE_MAPS_JS_KEY : undefined;
export const WEB_JS_KEY = envWebKey || 'AIzaSyBxgDpK3-dWsuXewlIWB68ubkuH4Q4eEB8';

export function getWebMapsKey() {
  return WEB_JS_KEY;
}

export function isPlaceholderKey() {
  return !WEB_JS_KEY || WEB_JS_KEY === 'YOUR_WEB_JS_KEY_HERE' || WEB_JS_KEY.includes('YOUR_');
}
