import { init } from "@amplitude/analytics-browser";

export async function setupAnalytics(amplitudeApiKey: string) {
  await init(amplitudeApiKey, undefined, {
    disableCookies: true,
    trackingOptions: {
      city: false,
      country: false,
      dma: false,
      ipAddress: false,
    },
  }).promise;
}
