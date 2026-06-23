"use client";

import Script from "next/script";
import { CLARITY_ID, GA_ID, clarityEnabled, gaEnabled } from "@/lib/analytics/config";
import { useConsent } from "./ConsentContext";

// Scripts are injected only after the user grants consent, so neither GA nor
// Clarity loads (or sets cookies) until then.
export default function AnalyticsScripts() {
  const { consent } = useConsent();
  if (consent !== "granted") return null;

  return (
    <>
      {gaEnabled() && (
        <>
          <Script
            id="ga-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('consent', 'default', {
                analytics_storage: 'granted',
                ad_storage: 'granted',
                ad_user_data: 'granted',
                ad_personalization: 'granted'
              });
              gtag('config', '${GA_ID}', { send_page_view: true });
            `}
          </Script>
        </>
      )}

      {clarityEnabled() && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window,document,"clarity","script","${CLARITY_ID}");
            window.clarity('consent', true);
          `}
        </Script>
      )}
    </>
  );
}
