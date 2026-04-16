const normalize = (value) => String(value || "").trim();

const KNOWN_TRACKING_PAGES = [
  {
    match: ["ecourier", "e courier"],
    url: "https://ecourier.com.bd/tracking/",
  },
  {
    match: ["pathao"],
    url: "https://pathao.com/courier/",
  },
  {
    match: ["steadfast", "stead fast"],
    url: "https://steadfast.com.bd/",
  },
  {
    match: ["sundarban", "sundarban courier"],
    url: "https://www.sundarbancourierltd.com/sets",
  },
  {
    match: ["redx", "red x"],
    url: "https://redx.com.bd/",
  },
];

export const buildTrackingUrl = (courier, trackingId) => {
  const c = normalize(courier).toLowerCase();
  const t = normalize(trackingId);
  if (!t) return "";

  const match = KNOWN_TRACKING_PAGES.find((entry) =>
    entry.match.some((keyword) => c.includes(keyword))
  );

  return match?.url || "";
};

export const hasTracking = (courier, trackingId) =>
  Boolean(normalize(courier) && normalize(trackingId));
