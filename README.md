# ZIRIGO — starter website

This is a first, mobile-friendly website starter for ZIRIGO Media, styled in cinematic black and gold and using the supplied ZIRIGO logo.

## Included
- Responsive home page and film catalogue layout
- Links to the official ZIRIGO YouTube channel
- Automatic latest-upload catalogue support using YouTube Data API v3
- Basic Progressive Web App (PWA) files for an installable home-screen experience
- No separate video hosting: video links open on YouTube in this starter version

## Before automatic uploads work
The site needs two public configuration values in `config.js`:
1. The permanent YouTube channel ID (starts with `UC`, not the @handle)
2. A Google API key with YouTube Data API v3 enabled

### Create a YouTube API key
1. Open Google Cloud Console: https://console.cloud.google.com/
2. Create a project (or select an existing project).
3. Enable **YouTube Data API v3**.
4. Create an API key under APIs & Services → Credentials.
5. Paste the key into `youtubeApiKey` in `config.js`.
6. Once hosted, restrict the key to YouTube Data API v3 and the website's HTTP referrers/domain. Do not share a Google account password or OAuth secret.

### Find your channel ID
While signed into the owner account, open YouTube Studio or YouTube account advanced settings and copy the permanent channel ID. It starts with `UC`. Paste it into `channelId` in `config.js`.

The website currently requests up to nine recent public videos. This first version uses the YouTube API's search endpoint, so API quota applies. If quota becomes a problem, we can switch to a more efficient uploads-playlist implementation.

## Publish free
A static host such as GitHub Pages or Cloudflare Pages can host these files on a free tier, subject to the host's current terms and limits. Upload the contents of this folder (not the ZIP itself, unless the service accepts ZIP deployments). HTTPS is needed for PWA installation/service-worker features.

## Important view-count note
The catalogue links to the official YouTube watch page in this starter version. That is reliable and sends the visitor to YouTube. In the next iteration, we can add an official embedded player on a dedicated watch page. YouTube decides whether each play counts as a valid view; autoplay or artificial view inflation must not be used. Embedding does not guarantee every playback will count.

## Not included yet
- Live deployment (no hosting account was connected)
- Final channel ID/API key setup
- Dedicated watch pages with embedded YouTube player
- Custom domain (optional, likely paid)
- Native Google Play Store app (PWA is the free first step)
