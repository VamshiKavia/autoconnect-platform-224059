Place your static image assets under:
  public/assets/

Optional: provide a very small blurred placeholder image (e.g., placeholder-blur.png)
  public/assets/placeholder-blur.png

The app now uses a ResponsiveImage component that will:
- Attempt to load AVIF/WebP variants if available (same base filename, different extension)
- Lazy-load non-hero images
- Use sizes/srcset for responsive delivery
- Optionally prefix asset URLs with REACT_APP_CDN_URL if set in .env

Examples:
  /assets/launch-hero-19609795.png
  /assets/launch-hero-19609795.webp
  /assets/launch-hero-19609795.avif
  /assets/placeholder-blur.png
