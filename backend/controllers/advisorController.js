const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Brand = require("../models/Brand");

const USAGE_KEYWORDS = {
  gaming: ["gaming", "gpu", "graphics", "rtx", "high refresh", "144hz", "120hz"],
  study: ["study", "student", "battery", "lightweight", "portable", "online class"],
  office: ["office", "business", "productivity", "excel", "meeting", "work"],
  media: ["media", "display", "oled", "amoled", "speaker", "netflix", "youtube"],
  battery: ["battery", "all-day", "all day", "endurance", "power", "long battery"],
  camera: ["camera", "photo", "photography", "selfie", "lens", "sensor", "ois"],
  movie: ["movie", "cinema", "hdr", "dolby vision", "4k", "streaming"],
  sports: ["sports", "motion", "brightness", "live", "fast motion"],
  sound: ["sound", "audio", "speaker", "dolby", "stereo", "bass"],
  music: ["music", "audio", "bass", "hi-res", "driver", "codec"],
  calling: ["calling", "call", "mic", "noise cancellation", "noise canceling"],
  travel: ["travel", "portable", "compact", "lightweight", "long battery"],
  video: ["video", "vlog", "vlogging", "stabilization", "4k", "fps", "autofocus"],
  photo: ["photo", "photography", "sensor", "aperture", "zoom", "lens"],
  fitness: ["fitness", "workout", "steps", "heart rate", "gps", "sport"],
  health: ["health", "heart rate", "sleep", "stress", "blood oxygen", "spo2"],
  style: ["style", "design", "fashion", "premium", "display", "watch face"],
  vlogging: ["vlog", "vlogging", "flip screen", "autofocus", "video"],
};

const USAGE_FAMILY_CONFIG = {
  general: {
    title: "General usage",
    hint: "Balanced choices for mixed everyday use.",
    options: [
      {
        value: "gaming",
        label: "Gaming",
        description: "Checks GPU power and smooth refresh rates.",
        defaultSelected: true,
      },
      {
        value: "study",
        label: "Study",
        description: "Favors battery life, portability, and value.",
        defaultSelected: true,
      },
      {
        value: "office",
        label: "Office",
        description: "Looks at speed, RAM, and productivity features.",
      },
      {
        value: "media",
        label: "Media",
        description: "Prioritizes display quality and speakers.",
      },
    ],
  },
  laptop: {
    title: "Laptop usage",
    hint: "Focused on portability, performance, and work balance.",
    options: [
      {
        value: "gaming",
        label: "Gaming",
        description: "Prioritizes graphics, cooling, and fast screens.",
        defaultSelected: true,
      },
      {
        value: "study",
        label: "Study",
        description: "Weights battery, weight, and everyday usability.",
        defaultSelected: true,
      },
      {
        value: "home",
        label: "Home",
        description: "Comfortable everyday use for family and casual tasks.",
      },
      {
        value: "office",
        label: "Office",
        description: "Checks CPU speed, RAM, and SSD responsiveness.",
      },
      {
        value: "media",
        label: "Entertainment",
        description: "Looks at display, speakers, and viewing comfort.",
      },
    ],
  },
  phone: {
    title: "Phone usage",
    hint: "Focused on daily battery, camera, and entertainment needs.",
    options: [
      {
        value: "camera",
        label: "Camera",
        description: "Prioritizes photo and video quality.",
        defaultSelected: true,
      },
      {
        value: "battery",
        label: "Battery life",
        description: "Looks for bigger batteries and endurance.",
        defaultSelected: true,
      },
      {
        value: "gaming",
        label: "Gaming",
        description: "Checks chipset, RAM, and display smoothness.",
      },
      {
        value: "media",
        label: "Entertainment",
        description: "Weighs display quality and stereo sound.",
      },
    ],
  },
  tv: {
    title: "TV usage",
    hint: "Built around picture quality, motion, and room sound.",
    options: [
      {
        value: "movie",
        label: "Movies",
        description: "Prioritizes HDR, contrast, and panel quality.",
        defaultSelected: true,
      },
      {
        value: "sports",
        label: "Sports",
        description: "Looks for motion handling and brightness.",
        defaultSelected: true,
      },
      {
        value: "gaming",
        label: "Gaming",
        description: "Checks refresh rate and input responsiveness.",
      },
      {
        value: "sound",
        label: "Sound",
        description: "Focuses on built-in speakers and audio output.",
      },
    ],
  },
  audio: {
    title: "Audio usage",
    hint: "Made for sound quality, comfort, and portability.",
    options: [
      {
        value: "music",
        label: "Music",
        description: "Balances clarity, bass, and codecs.",
        defaultSelected: true,
      },
      {
        value: "calling",
        label: "Calling",
        description: "Looks for good mics and noise cancellation.",
        defaultSelected: true,
      },
      {
        value: "travel",
        label: "Travel",
        description: "Prioritizes portability and battery life.",
      },
      {
        value: "gaming",
        label: "Gaming",
        description: "Checks latency and wireless stability.",
      },
    ],
  },
  camera: {
    title: "Camera usage",
    hint: "Focused on image quality, stabilization, and content creation.",
    options: [
      {
        value: "photo",
        label: "Photo",
        description: "Prioritizes sensor detail and lens quality.",
        defaultSelected: true,
      },
      {
        value: "video",
        label: "Video",
        description: "Looks at stabilization and recording quality.",
        defaultSelected: true,
      },
      {
        value: "travel",
        label: "Travel",
        description: "Balances compact size and battery life.",
      },
      {
        value: "vlogging",
        label: "Vlogging",
        description: "Checks autofocus, framing, and flip-screen features.",
      },
    ],
  },
  watch: {
    title: "Watch usage",
    hint: "Built around health tracking, battery, and wearability.",
    options: [
      {
        value: "fitness",
        label: "Fitness",
        description: "Weights activity tracking and durability.",
        defaultSelected: true,
      },
      {
        value: "health",
        label: "Health",
        description: "Looks at heart-rate and wellness features.",
        defaultSelected: true,
      },
      {
        value: "battery",
        label: "Battery life",
        description: "Prioritizes longer time between charges.",
      },
      {
        value: "style",
        label: "Style",
        description: "Focuses on design, display, and fit.",
      },
    ],
  },
};

const USAGE_FAMILY_MATCHERS = [
  { family: "laptop", terms: ["laptop", "notebook", "ultrabook", "macbook", "computer", "pc", "desktop"] },
  { family: "phone", terms: ["phone", "mobile", "smartphone", "android", "iphone", "tablet"] },
  { family: "tv", terms: ["tv", "television", "monitor", "display"] },
  { family: "audio", terms: ["audio", "headphone", "headset", "earbud", "earphone", "speaker"] },
  { family: "camera", terms: ["camera", "dslr", "mirrorless", "vlog"] },
  { family: "watch", terms: ["watch", "smartwatch", "wearable"] },
];

const DEFAULT_USAGE_FAMILY = "general";

const getUsageFamily = (category) => {
  const slug = toText(category?.slug);
  const name = toText(category?.name);
  const haystack = `${slug} ${name}`.trim();
  for (const matcher of USAGE_FAMILY_MATCHERS) {
    if (matcher.terms.some((term) => haystack.includes(term))) return matcher.family;
  }

  const attributes = Array.isArray(category?.attributes)
    ? category.attributes.map((attr) => toText(attr))
    : [];
  if (attributes.some((attr) => ["battery", "battery_life", "weight", "display_size"].includes(attr))) {
    return "laptop";
  }
  if (attributes.some((attr) => ["camera", "sensor", "lens", "aperture"].includes(attr))) {
    return "camera";
  }
  if (attributes.some((attr) => ["heart_rate", "spo2", "fitness", "gps"].includes(attr))) {
    return "watch";
  }

  return DEFAULT_USAGE_FAMILY;
};

const buildUsageMetadata = (category) => {
  const family = getUsageFamily(category);
  const familyConfig = USAGE_FAMILY_CONFIG[family] || USAGE_FAMILY_CONFIG[DEFAULT_USAGE_FAMILY];

  return {
    family,
    title: familyConfig.title,
    hint: familyConfig.hint,
    options: familyConfig.options,
  };
};

const toNum = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toText = (value) => String(value || "").trim().toLowerCase();

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getMapValue = (mapLike, key) => {
  if (!mapLike || !key) return "";
  if (typeof mapLike.get === "function") return String(mapLike.get(key) || "");
  return String(mapLike[key] || "");
};

const getVariantAttributeValue = (product, key) => {
  if (!product?.variants?.length) return "";
  for (const variant of product.variants) {
    const value = getMapValue(variant?.attributes, key);
    if (value) return value;
  }
  return "";
};

const getSpecValue = (product, key) => getMapValue(product?.specs, key);

const getBestFieldValue = (product, key) => {
  const fromVariant = getVariantAttributeValue(product, key);
  if (fromVariant) return fromVariant;
  return getSpecValue(product, key);
};

const getMinPrice = (product) => {
  const variantPrices = (product?.variants || [])
    .map((v) => toNum(v?.price, NaN))
    .filter((v) => Number.isFinite(v) && v > 0);

  const basePrice = toNum(product?.basePrice, 0);
  if (!variantPrices.length) return basePrice;
  return Math.min(basePrice > 0 ? basePrice : Infinity, ...variantPrices);
};

const parseMemoryToGB = (raw) => {
  const text = toText(raw);
  if (!text) return 0;

  const num = Number((text.match(/(\d+(\.\d+)?)/) || [])[1] || 0);
  if (!Number.isFinite(num) || num <= 0) return 0;

  if (text.includes("tb")) return num * 1024;
  return num;
};

const parseNumberFromText = (raw) => {
  const text = toText(raw);
  if (!text) return 0;
  const match = text.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : 0;
};

const parseRefreshRate = (raw) => {
  const text = toText(raw);
  if (!text) return 0;
  const hzMatch = text.match(/(\d+(\.\d+)?)\s*hz/);
  if (hzMatch) return Number(hzMatch[1]);
  return parseNumberFromText(text);
};

const parseBatteryWh = (raw) => {
  const text = toText(raw);
  if (!text) return 0;
  const num = parseNumberFromText(text);
  if (!num) return 0;
  if (text.includes("mah")) return num / 100;
  return num;
};

const parseBatteryHours = (raw) => {
  const text = toText(raw);
  if (!text) return 0;
  const hrMatch = text.match(/(\d+(\.\d+)?)\s*(h|hr|hrs|hour|hours)/);
  if (hrMatch) return Number(hrMatch[1]);
  return 0;
};

const parseWeightKg = (raw) => {
  const text = toText(raw);
  if (!text) return 0;
  const num = parseNumberFromText(text);
  if (!num) return 0;
  if (text.includes("g") && !text.includes("kg")) return num / 1000;
  return num;
};

const parseDisplaySize = (raw) => {
  const text = toText(raw);
  if (!text) return 0;
  const inchMatch = text.match(/(\d+(\.\d+)?)\s*(\"|inch|inches|in)\b/);
  if (inchMatch) return Number(inchMatch[1]);
  return parseNumberFromText(text);
};

const getTextValues = (product, keys = []) => {
  const values = [];

  for (const key of keys) {
    const specValue = getSpecValue(product, key);
    if (specValue) values.push(specValue);

    for (const variant of product?.variants || []) {
      const attrValue = getMapValue(variant?.attributes, key);
      if (attrValue) values.push(attrValue);
    }
  }

  return values.map((value) => String(value).trim()).filter(Boolean);
};

const getJoinedTextValues = (product, keys = []) => getTextValues(product, keys).join(" ").toLowerCase();

const getMaxParsedValue = (values, parser) =>
  values.reduce((max, value) => Math.max(max, parser(value)), 0);

const isFastProcessor = (text) => {
  if (!text) return false;
  return /(core\s*i[5-9]|ultra\s*[5-9]|ryzen\s*[5-9]|snapdragon\s*8|dimensity\s*(8|9)|apple\s*m[1-9]|a1[5-9]|a[2-9]\d)/i.test(text);
};

const isDedicatedGpu = (text) => {
  if (!text) return false;
  return /(rtx|gtx|rx\s*\d|radeon|geforce|arc\s*a|dedicated gpu)/i.test(text);
};

const isSolidStateStorage = (text) => {
  if (!text) return false;
  return /(ssd|nvme|pcie)/i.test(text);
};

const scoreUsageFit = (product, useCase, context = {}) => {
  const {
    searchBlob = "",
    ramGB = 0,
    storageGB = 0,
    categoryFamily = DEFAULT_USAGE_FAMILY,
  } = context;
  const specsText = getJoinedTextValues(product, [
    "processor",
    "chipset",
    "cpu",
    "gpu",
    "graphics",
    "display",
    "display_type",
    "display_resolution",
    "refresh_rate",
    "screen",
    "battery",
    "battery_capacity",
    "battery_life",
    "storage_type",
    "weight",
    "audio",
    "speaker",
  ]);
  const performanceText = `${specsText} ${searchBlob}`.trim();
  const refreshRate = getMaxParsedValue(getTextValues(product, ["refresh_rate", "display", "screen"]), parseRefreshRate);
  const batteryWh = getMaxParsedValue(getTextValues(product, ["battery_capacity", "battery"]), parseBatteryWh);
  const batteryHours = getMaxParsedValue(getTextValues(product, ["battery_life"]), parseBatteryHours);
  const weightKg = getMaxParsedValue(getTextValues(product, ["weight"]), parseWeightKg);
  const displaySize = getMaxParsedValue(getTextValues(product, ["display_size", "display", "screen"]), parseDisplaySize);
  const displayText = getJoinedTextValues(product, ["display_type", "display", "screen", "display_resolution"]);
  const storageText = getJoinedTextValues(product, ["storage_type", "storage"]);
  const processorText = getJoinedTextValues(product, ["processor", "chipset", "cpu"]);
  const gpuText = getJoinedTextValues(product, ["gpu", "graphics", "chipset"]);
  const audioText = `${getJoinedTextValues(product, ["audio", "speaker"])} ${searchBlob}`;
  const cameraText = getJoinedTextValues(product, [
    "camera",
    "rear_camera",
    "front_camera",
    "main_camera",
    "lens",
    "sensor",
    "aperture",
    "stabilization",
  ]);
  const healthText = getJoinedTextValues(product, ["heart_rate", "spo2", "health", "fitness", "gps", "water_resistance"]);

  let score = 0;
  let reason = "";

  if (useCase === "gaming") {
    if (categoryFamily === "tv") {
      if (refreshRate >= 120) score += 10;
      else if (refreshRate >= 90) score += 6;
      if (displaySize >= 43) score += 4;
      if (/(hdr|game mode|low latency)/i.test(displayText)) score += 3;
    } else {
      if (isDedicatedGpu(gpuText)) score += 10;
      else if (/(adreno|mali|iris xe|vega)/i.test(gpuText)) score += 4;

      if (refreshRate >= 144) score += 8;
      else if (refreshRate >= 120) score += 6;
      else if (refreshRate >= 90) score += 3;

      if (ramGB >= 16) score += 7;
      else if (ramGB >= 8) score += 3;

      if (storageGB >= 1024) score += 4;
      else if (storageGB >= 512) score += 3;

      if (isFastProcessor(processorText)) score += 7;
    }

    if (categoryFamily === "phone") {
      if (batteryWh >= 40 || batteryHours >= 8) score += 4;
      if (storageGB >= 128) score += 2;
    }

    if (score >= 16) reason = "Strong gaming-ready specs";
    else if (score >= 8) reason = "Suitable for casual gaming";
  }

  if (useCase === "study") {
    if (batteryHours >= 8 || batteryWh >= 45) score += 8;
    else if (batteryHours >= 5 || batteryWh >= 30) score += 4;

    if (weightKg > 0 && weightKg <= 1.8) score += 6;
    else if (/(portable|lightweight|thin|compact)/i.test(performanceText)) score += 4;

    if (ramGB >= 8) score += 4;
    if (storageGB >= 256 || isSolidStateStorage(storageText)) score += 4;

    if (displaySize > 0 && displaySize <= 15.6) score += 2;

    if (categoryFamily === "phone") {
      if (batteryWh >= 35) score += 4;
      if (weightKg > 0 && weightKg <= 0.22) score += 3;
    }

    if (score >= 14) reason = "Great for study and portability";
    else if (score >= 8) reason = "Well suited for student use";
  }

  if (useCase === "office") {
    if (ramGB >= 16) score += 7;
    else if (ramGB >= 8) score += 5;

    if (storageGB >= 256) score += 4;
    if (isSolidStateStorage(storageText)) score += 5;
    if (isFastProcessor(processorText)) score += 5;
    if (batteryHours >= 6 || batteryWh >= 35) score += 3;

    if (score >= 13) reason = "Strong fit for office productivity";
    else if (score >= 8) reason = "Good for everyday office tasks";
  }

  if (useCase === "home") {
    if (categoryFamily === "tv") {
      if (displaySize >= 43) score += 5;
      if (/(oled|qled|mini led|hdr|4k|uhd|wide color)/i.test(displayText)) score += 6;
      if (/(stereo|dolby|speaker|audio|sound|atmos)/i.test(audioText)) score += 4;
      if (refreshRate >= 120) score += 2;
    } else {
      if (batteryHours >= 8 || batteryWh >= 40) score += 4;
      if (ramGB >= 8) score += 3;
      if (storageGB >= 256) score += 3;
      if (/(comfortable|easy|simple|family|everyday|home)/i.test(performanceText)) score += 4;
      if (/(display|screen|speaker|audio|battery|portable)/i.test(performanceText)) score += 2;
    }

    if (score >= 10) reason = "Good for everyday home use";
    else if (score >= 6) reason = "Comfortable for casual home use";
  }

  if (useCase === "media") {
    if (categoryFamily === "tv") {
      if (/(oled|qled|mini led|mini-led|quantum|hdr)/i.test(displayText)) score += 8;
      else if (/(ips|fhd|qhd|4k|uhd)/i.test(displayText)) score += 4;
      if (displaySize >= 43) score += 4;
      if (/(stereo|dolby|speaker|audio|sound|atmos)/i.test(audioText)) score += 5;
    } else {
      if (/(oled|amoled)/i.test(displayText)) score += 8;
      else if (/(ips|fhd|qhd|4k|retina)/i.test(displayText)) score += 4;

      if (displaySize >= 14 || (displaySize >= 6.4 && displaySize <= 8)) score += 4;
      if (refreshRate >= 120) score += 4;
      else if (refreshRate >= 90) score += 2;

      if (/(stereo|dolby|speaker|audio|sound)/i.test(audioText)) score += 4;
      if (batteryHours >= 8 || batteryWh >= 45) score += 2;
    }

    if (score >= 12) reason = "Excellent for media consumption";
    else if (score >= 7) reason = "Good display and media-friendly specs";
  }

  if (useCase === "battery") {
    if (batteryHours >= 16 || batteryWh >= 60) score += 10;
    else if (batteryHours >= 10 || batteryWh >= 45) score += 7;
    else if (batteryHours >= 6 || batteryWh >= 30) score += 4;

    if (weightKg > 0 && weightKg <= 0.25) score += 3;
    if (/(efficient|low power|power saving|ai power)/i.test(performanceText)) score += 2;
    if (categoryFamily === "watch" && batteryWh >= 10) score += 3;

    if (score >= 12) reason = "Excellent battery endurance";
    else if (score >= 7) reason = "Solid battery-focused pick";
  }

  if (useCase === "camera" || useCase === "photo") {
    if (/(\b\d{2,3}\s*mp\b|\b\d{2,3}\s*megapixel\b)/i.test(cameraText)) score += 6;
    if (/(ois|eis|stabil|optical zoom|telephoto|ultra wide|ultrawide|macro|autofocus)/i.test(cameraText)) score += 6;
    if (/(hdr|night mode|portrait|pro mode|raw)/i.test(cameraText)) score += 3;
    if (categoryFamily === "phone" && displaySize >= 6) score += 1;

    if (score >= 12) reason = "Excellent for photography";
    else if (score >= 7) reason = "Good camera-focused features";
  }

  if (useCase === "movie" || useCase === "sound") {
    if (/(oled|qled|mini led|mini-led|hdr|dolby vision|wide color|4k|uhd)/i.test(displayText)) score += 7;
    else if (/(ips|fhd|qhd|retina)/i.test(displayText)) score += 3;
    if (displaySize >= 43 || displaySize >= 6.4) score += 3;
    if (/(stereo|dolby|speaker|audio|sound|atmos|subwoofer)/i.test(audioText)) score += 5;
    if (score >= 11) reason = "Great for movies and entertainment";
    else if (score >= 6) reason = "Good for casual watching";
  }

  if (useCase === "sports") {
    if (refreshRate >= 120) score += 7;
    else if (refreshRate >= 90) score += 4;
    if (/(bright|brightness|hdr|motion|smooth)/i.test(displayText)) score += 4;
    if (displaySize >= 43 || displaySize >= 6.4) score += 2;
    if (score >= 10) reason = "Great for fast motion and sports";
    else if (score >= 6) reason = "Decent for sports viewing";
  }

  if (useCase === "music") {
    if (/(hi-res|lossless|ldac|aptx|aac|codec)/i.test(audioText)) score += 4;
    if (/(stereo|dolby|speaker|bass|driver|sound)/i.test(audioText)) score += 5;
    if (batteryHours >= 10 || batteryWh >= 40) score += 3;
    if (score >= 10) reason = "Strong for music playback";
    else if (score >= 6) reason = "Good for audio listening";
  }

  if (useCase === "calling") {
    if (/(mic|microphone|noise cancellation|noise canceling|anc|beamforming)/i.test(audioText)) score += 7;
    if (batteryHours >= 8 || batteryWh >= 35) score += 2;
    if (/(bluetooth|wifi|5g|lte|network)/i.test(performanceText)) score += 2;
    if (score >= 9) reason = "Good for calls and meetings";
    else if (score >= 5) reason = "Usable for everyday calling";
  }

  if (useCase === "travel") {
    if (batteryHours >= 12 || batteryWh >= 50) score += 6;
    else if (batteryHours >= 8 || batteryWh >= 35) score += 3;
    if (weightKg > 0 && weightKg <= 1.5) score += 4;
    else if (/(portable|compact|lightweight|slim)/i.test(performanceText)) score += 3;
    if (categoryFamily === "audio" && batteryWh >= 20) score += 2;
    if (score >= 10) reason = "Great travel-friendly option";
    else if (score >= 6) reason = "Good for on-the-go use";
  }

  if (useCase === "video" || useCase === "vlogging") {
    if (/(4k|60fps|120fps|stabil|gimbal|ois|eis|autofocus|flip screen|selfie)/i.test(cameraText)) score += 8;
    if (/(hdr|wide angle|ultra wide|telephoto|night mode)/i.test(cameraText)) score += 3;
    if (batteryHours >= 8 || batteryWh >= 35) score += 2;
    if (score >= 11) reason = "Good for video creation";
    else if (score >= 6) reason = "Suitable for casual video";
  }

  if (useCase === "fitness" || useCase === "health" || useCase === "style") {
    if (/(water resistant|ip\d{2}|gps|heart rate|spo2|ecg|steps|activity|sleep|stress)/i.test(healthText)) score += 8;
    if (/(lightweight|compact|slim|comfortable)/i.test(performanceText)) score += 3;
    if (batteryHours >= 12 || batteryWh >= 10) score += 2;
    if (useCase === "style" && /(premium|amoled|oled|metal|glass)/i.test(displayText)) score += 2;
    if (score >= 11) reason = "Strong wearable fit";
    else if (score >= 6) reason = "Good everyday wearable choice";
  }

  return { score, reason };
};

const normalizeBudget = (minRaw, maxRaw) => {
  let min = toNum(minRaw, 0);
  let max = toNum(maxRaw, 0);
  if (min > 0 && max > 0 && min > max) {
    const tmp = min;
    min = max;
    max = tmp;
  }
  return { min, max };
};

const scorePriceFit = (price, minBudget, maxBudget) => {
  if (price <= 0 || (minBudget <= 0 && maxBudget <= 0)) {
    return { score: 0, reason: "" };
  }

  if ((minBudget <= 0 || price >= minBudget) && (maxBudget <= 0 || price <= maxBudget)) {
    let closenessScore = 40;
    if (minBudget > 0 && maxBudget > 0) {
      const center = (minBudget + maxBudget) / 2;
      const spread = Math.max(1, (maxBudget - minBudget) / 2);
      const distance = Math.abs(price - center);
      const closeness = Math.max(0, 1 - distance / spread);
      closenessScore = 32 + closeness * 12;
    }
    return { score: closenessScore, reason: "Fits your budget" };
  }

  if (maxBudget > 0 && price <= maxBudget * 1.12) {
    return { score: 10, reason: "Slightly above budget, still close" };
  }

  if (minBudget > 0 && price >= minBudget * 0.9) {
    return { score: 4, reason: "Close to your budget range" };
  }

  return { score: -18, reason: "" };
};

const scoreCapacity = (actual, preferred, label) => {
  if (preferred <= 0 || actual <= 0) return { score: 0, reason: "" };
  if (actual >= preferred) return { score: 14, reason: `Meets ${label} need` };

  const ratio = actual / preferred;
  if (ratio >= 0.8) return { score: 5, reason: `Close to your ${label} need` };
  return { score: -8, reason: "" };
};

const resolveCategory = async (raw) => {
  if (!raw) return null;
  const value = String(raw).trim();

  if (isObjectId(value)) {
    const byId = await Category.findById(value).select("_id name slug attributes");
    if (byId) return byId;
  }

  return Category.findOne({
    $or: [{ slug: value.toLowerCase() }, { name: new RegExp(`^${escapeRegExp(value)}$`, "i") }],
  }).select("_id name slug attributes");
};

const resolveBrand = async (raw) => {
  if (!raw) return null;
  const value = String(raw).trim();

  if (isObjectId(value)) {
    const byId = await Brand.findById(value).select("_id name slug");
    if (byId) return byId;
  }

  return Brand.findOne({
    $or: [{ slug: value.toLowerCase() }, { name: new RegExp(`^${escapeRegExp(value)}$`, "i") }],
  }).select("_id name slug");
};

const collectValues = (products, key) => {
  const values = new Set();

  for (const product of products) {
    for (const variant of product?.variants || []) {
      const value = getMapValue(variant?.attributes, key);
      if (value) values.add(value.trim());
    }
    const specValue = getSpecValue(product, key);
    if (specValue) values.add(specValue.trim());
  }

  return Array.from(values).sort((a, b) => a.localeCompare(b));
};

const buildSearchBlob = (product) => {
  const specs = product?.specs && typeof product.specs.entries === "function"
    ? Object.fromEntries(product.specs.entries())
    : (product?.specs || {});
  const specText = Object.entries(specs)
    .map(([k, v]) => `${k} ${v}`)
    .join(" ");
  const highlightText = (product?.highlights || []).join(" ");
  const tagText = (product?.tags || []).join(" ");
  return `${product?.name || ""} ${product?.description || ""} ${specText} ${highlightText} ${tagText}`.toLowerCase();
};

exports.getAdvisorMetadata = async (req, res) => {
  try {
    const categoryRaw = req.query.category;
    const category = await resolveCategory(categoryRaw);

    const filter = { isActive: true, isDeleted: { $ne: true } };
    if (category) filter.category = category._id;

    const products = await Product.find(filter)
      .populate("brand", "name slug")
      .select("brand specs variants");

    const brandMap = new Map();
    for (const p of products) {
      if (p?.brand?._id) {
        brandMap.set(String(p.brand._id), {
          _id: p.brand._id,
          name: p.brand.name,
          slug: p.brand.slug,
        });
      }
    }

    const categoryAttributes = Array.isArray(category?.attributes) ? category.attributes : [];
    const dynamicAttributes = categoryAttributes.filter((attr) => !["ram", "storage"].includes(attr));

    const dynamicQuestions = dynamicAttributes.map((attrKey) => ({
      key: attrKey,
      label: attrKey.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
      options: collectValues(products, attrKey),
    }));
    const usageMetadata = buildUsageMetadata(category);

    return res.json({
      category: category
        ? { _id: category._id, name: category.name, slug: category.slug }
        : null,
      brands: Array.from(brandMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      ramOptions: collectValues(products, "ram"),
      storageOptions: collectValues(products, "storage"),
      usageFamily: usageMetadata.family,
      usageTitle: usageMetadata.title,
      usageHint: usageMetadata.hint,
      usageOptions: usageMetadata.options,
      dynamicQuestions,
    });
  } catch (error) {
    console.error("getAdvisorMetadata Error:", error);
    res.status(500).json({ message: "Failed to load advisor metadata" });
  }
};

exports.getAdvisorRecommendations = async (req, res) => {
  try {
    const {
      budgetMin,
      budgetMax,
      category: categoryRaw,
      brand: brandRaw,
      usage = [],
      ram = "",
      storage = "",
      attributePreferences = {},
    } = req.body || {};

    const category = await resolveCategory(categoryRaw);
    const brand = await resolveBrand(brandRaw);
    const usageMetadata = buildUsageMetadata(category);
    const categoryFamily = usageMetadata.family;

    const filter = { isActive: true, isDeleted: { $ne: true } };
    if (category) filter.category = category._id;
    if (brand) filter.brand = brand._id;

    const products = await Product.find(filter)
      .populate("brand", "name slug")
      .populate("category", "name slug")
      .select(
        "name slug basePrice variants specs highlights description tags rating isFeatured brand category"
      );

    const { min: minBudget, max: maxBudget } = normalizeBudget(budgetMin, budgetMax);
    const normalizedUsage = Array.isArray(usage)
      ? usage.map((u) => toText(u)).filter(Boolean)
      : [toText(usage)].filter(Boolean);

    const preferredRamGB = parseMemoryToGB(ram);
    const preferredStorageGB = parseMemoryToGB(storage);

    const ranked = products.map((product) => {
      const reasons = [];
      let score = 0;

      const price = getMinPrice(product);
      const priceFit = scorePriceFit(price, minBudget, maxBudget);
      score += priceFit.score;
      if (priceFit.reason) reasons.push(priceFit.reason);

      if (brand && String(product?.brand?._id) === String(brand._id)) {
        score += 20;
        reasons.push(`Matches preferred brand (${brand.name})`);
      }

      const searchBlob = buildSearchBlob(product);
      const productRamGB = parseMemoryToGB(getBestFieldValue(product, "ram"));
      const productStorageGB = parseMemoryToGB(getBestFieldValue(product, "storage"));

      for (const useCase of normalizedUsage) {
        const usageSpecScore = scoreUsageFit(product, useCase, {
          searchBlob,
          ramGB: productRamGB,
          storageGB: productStorageGB,
          categoryFamily,
        });
        score += usageSpecScore.score;
        if (usageSpecScore.reason) reasons.push(usageSpecScore.reason);

        const terms = USAGE_KEYWORDS[useCase] || [useCase];
        if (terms.some((term) => searchBlob.includes(term))) {
          score += 4;
          reasons.push(`Good for ${useCase}`);
        }
      }
      const ramScore = scoreCapacity(productRamGB, preferredRamGB, "RAM");
      score += ramScore.score;
      if (ramScore.reason) reasons.push(ramScore.reason);

      const storageScore = scoreCapacity(productStorageGB, preferredStorageGB, "storage");
      score += storageScore.score;
      if (storageScore.reason) reasons.push(storageScore.reason);

      const dynamicPrefs = attributePreferences && typeof attributePreferences === "object"
        ? attributePreferences
        : {};

      Object.entries(dynamicPrefs).forEach(([key, preferredValue]) => {
        const expected = toText(preferredValue);
        if (!expected) return;
        const actual = toText(getBestFieldValue(product, key));
        if (actual.includes(expected)) {
          score += 8;
          reasons.push(`Matches ${key.replace(/_/g, " ")}`);
        } else if (actual) {
          score -= 2;
        }
      });

      score += Math.min(10, toNum(product.rating, 0) * 2);
      if (product.isFeatured) score += 3;

      const knownDataPoints = [productRamGB, productStorageGB, price].filter((v) => v > 0).length;
      score += knownDataPoints * 0.8;

      return {
        product,
        score,
        reasons: Array.from(new Set(reasons)).slice(0, 4),
      };
    });

    ranked.sort((a, b) => b.score - a.score);

    const recommendations = [];
    const usedBrands = new Set();
    for (const item of ranked) {
      const brandId = String(item?.product?.brand?._id || "");
      const keepBecauseStrong = item.score >= (ranked[0]?.score || 0) - 8;
      if (usedBrands.has(brandId) && !keepBecauseStrong) continue;
      recommendations.push(item);
      if (brandId) usedBrands.add(brandId);
      if (recommendations.length === 3) break;
    }

    if (recommendations.length < 3) {
      for (const item of ranked) {
        if (recommendations.includes(item)) continue;
        recommendations.push(item);
        if (recommendations.length === 3) break;
      }
    }

    const bestScore = recommendations[0]?.score || 1;
    const recommendationPayload = recommendations.map((item) => {
      const p = item.product;
      const confidence = Math.max(1, Math.min(100, Math.round((item.score / bestScore) * 100)));
      return {
        _id: p._id,
        name: p.name,
        slug: p.slug,
        brand: p.brand,
        category: p.category,
        basePrice: p.basePrice,
        variants: p.variants || [],
        score: item.score,
        confidence,
        reasons: item.reasons,
      };
    });

    res.json({
      criteria: {
        budgetMin: minBudget || null,
        budgetMax: maxBudget || null,
        category: category ? { _id: category._id, name: category.name, slug: category.slug } : null,
        brand: brand ? { _id: brand._id, name: brand.name, slug: brand.slug } : null,
        usageFamily: categoryFamily,
        usage: normalizedUsage,
        ram: ram || null,
        storage: storage || null,
      },
      totalConsidered: ranked.length,
      recommendations: recommendationPayload,
    });
  } catch (error) {
    console.error("getAdvisorRecommendations Error:", error);
    res.status(500).json({ message: "Failed to generate recommendations" });
  }
};
