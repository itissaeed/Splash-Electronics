const normalize = (value) => String(value || "").trim();

export const buildTrackingUrl = (courier, trackingId) => {
  const c = normalize(courier).toLowerCase();
  const t = normalize(trackingId);
  if (!t) return "";

  const query = encodeURIComponent(`${c || "courier"} tracking ${t}`);
  return `https://www.google.com/search?q=${query}`;
};

export const hasTracking = (courier, trackingId) =>
  Boolean(normalize(courier) && normalize(trackingId));
