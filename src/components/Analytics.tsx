import Script from 'next/script';

// Privacy-friendly, cookie-free analytics. It renders nothing unless the matching
// env vars are set, so local and preview builds stay clean and npm ci is unaffected
// (no runtime dependency). Set the vars in the Vercel project settings:
//
//   Plausible:  NEXT_PUBLIC_PLAUSIBLE_DOMAIN   (e.g. the bare host of the site)
//               NEXT_PUBLIC_PLAUSIBLE_SRC      (optional, defaults to plausible.io)
//   Umami:      NEXT_PUBLIC_UMAMI_WEBSITE_ID   (the website id)
//               NEXT_PUBLIC_UMAMI_SRC          (the script URL of your Umami instance)
//
// Set whichever provider you use; both can be set, neither is required.
export default function Analytics() {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const plausibleSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js';
  const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiSrc = process.env.NEXT_PUBLIC_UMAMI_SRC;

  return (
    <>
      {plausibleDomain ? (
        <Script
          defer
          data-domain={plausibleDomain}
          src={plausibleSrc}
          strategy="afterInteractive"
        />
      ) : null}
      {umamiId && umamiSrc ? (
        <Script defer data-website-id={umamiId} src={umamiSrc} strategy="afterInteractive" />
      ) : null}
    </>
  );
}
