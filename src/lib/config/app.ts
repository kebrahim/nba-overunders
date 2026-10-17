// The app's display name and public URL, in one place so a rename is a
// one-line change (or just an env var on Vercel, no code change at all).
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Hardwood";
export const APP_TAGLINE = "NBA Over/Unders";

// Used in text messages that link back to the site. Set NEXT_PUBLIC_SITE_URL
// on Vercel to your production domain (e.g. https://hardwood.example.com);
// falls back to Vercel's own production URL when unset.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");

/** SITE_URL without the protocol, for compact links inside texts. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
