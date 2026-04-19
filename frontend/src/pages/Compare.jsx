import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import useCompareItems from "../utils/useCompare";
import {
  clearCompareItems,
  removeCompareItem,
  COMPARE_LIMIT,
  getCompareKey,
  getCompareCategory,
} from "../utils/compare";

const fallbackImg =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=60";

const money = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "BDT 0";
  return `BDT ${num.toLocaleString("en-BD")}`;
};

const normalizeAttributeEntries = (attributes) => {
  if (!attributes) return [];
  if (attributes instanceof Map) {
    return Array.from(attributes.entries()).filter(([k, v]) => k && String(v || "").trim());
  }
  if (typeof attributes === "object") {
    return Object.entries(attributes).filter(([k, v]) => k && String(v || "").trim());
  }
  return [];
};

const prettyAttrKey = (key) =>
  String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const getDefaultVariant = (product) => {
  const variants = product?.variants || [];
  if (!variants.length) return null;
  return (
    variants.find((v) => v?.isDefault) ||
    variants.find((v) => Number((v?.availableStock ?? v?.countInStock) || 0) > 0) ||
    variants[0]
  );
};

const getAttributeMap = (product) => {
  const variant = getDefaultVariant(product);
  return normalizeAttributeEntries(variant?.attributes).reduce((acc, [k, v]) => {
    acc[k] = String(v);
    return acc;
  }, {});
};

const getSpecsMap = (product) => {
  const specsRaw = product?.specs;
  if (!specsRaw || typeof specsRaw !== "object") return {};
  const entries = specsRaw instanceof Map ? Array.from(specsRaw.entries()) : Object.entries(specsRaw);
  return entries.reduce((acc, [k, v]) => {
    if (!k || String(v || "").trim() === "") return acc;
    acc[k] = String(v);
    return acc;
  }, {});
};

const getProductDataMap = (product) => ({
  ...getSpecsMap(product),
  ...getAttributeMap(product),
});

const getLookupValue = (product, keys) => {
  const data = getProductDataMap(product);
  for (const key of keys) {
    const value = data[key];
    if (String(value || "").trim()) return String(value);
  }
  return "";
};

const parseNumber = (value) => {
  const match = String(value || "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
};

const parseMemoryToGB = (value) => {
  const text = String(value || "").toLowerCase();
  const match = text.match(/(\d+(?:\.\d+)?)\s*(tb|gb|mb)/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "tb") return amount * 1024;
  if (unit === "mb") return amount / 1024;
  return amount;
};

const parseRefreshRate = (value) => {
  const match = String(value || "").match(/(\d+(?:\.\d+)?)\s*hz/i);
  if (match) return Number(match[1]);
  return parseNumber(value);
};

const parseDisplaySize = (value) => {
  const text = String(value || "");
  const inchMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:"|inch|in\b)/i);
  if (inchMatch) return Number(inchMatch[1]);
  const fallback = parseNumber(text);
  return fallback > 0 && fallback < 120 ? fallback : 0;
};

const parseBatteryMah = (value) => {
  const match = String(value || "").match(/(\d+(?:\.\d+)?)\s*mah/i);
  return match ? Number(match[1]) : 0;
};

const parseBatteryHours = (value) => {
  const match = String(value || "").match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h\b)/i);
  return match ? Number(match[1]) : 0;
};

const parseCameraMP = (value) => {
  const matches = Array.from(String(value || "").matchAll(/(\d+(?:\.\d+)?)\s*(?:mp|megapixel)/gi));
  if (!matches.length) return 0;
  return matches.reduce((max, match) => Math.max(max, Number(match[1]) || 0), 0);
};

const getResolutionScore = (value) => {
  const text = String(value || "").toLowerCase();
  if (/(8k)/.test(text)) return 5;
  if (/(4k|uhd|2160)/.test(text)) return 4;
  if (/(qhd|1440|2k)/.test(text)) return 3;
  if (/(fhd|1080)/.test(text)) return 2;
  if (/(hd|720)/.test(text)) return 1;
  return 0;
};

const getPanelScore = (value) => {
  const text = String(value || "").toLowerCase();
  if (/(oled|amoled|qled|mini led|mini-led)/.test(text)) return 4;
  if (/(ips|retina)/.test(text)) return 3;
  if (/(va)/.test(text)) return 2;
  if (/(tn)/.test(text)) return 1;
  return 0;
};

const getProcessorScore = (value) => {
  const text = String(value || "").toLowerCase();
  if (/(ultra 9|core i9|ryzen 9|m4|max|snapdragon 8 elite|snapdragon 8 gen|dimensity 9300|apple m3|apple m4)/.test(text)) {
    return 5;
  }
  if (/(ultra 7|core i7|ryzen 7|m3|snapdragon 8|dimensity 9200|tensor g4|tensor g3)/.test(text)) {
    return 4;
  }
  if (/(ultra 5|core i5|ryzen 5|m2|snapdragon 7|dimensity 8000|tensor g2)/.test(text)) {
    return 3;
  }
  if (/(core i3|ryzen 3|snapdragon 6|dimensity 7000|pentium)/.test(text)) {
    return 2;
  }
  return text ? 1 : 0;
};

const getProductSignals = (product) => {
  const displayText = getLookupValue(product, ["display_type", "display", "screen", "display_resolution"]);
  const batteryText = getLookupValue(product, ["battery_capacity", "battery", "battery_life"]);
  const cameraText = getLookupValue(product, [
    "camera",
    "rear_camera",
    "front_camera",
    "main_camera",
    "lens",
    "sensor",
  ]);
  const processorText = getLookupValue(product, ["processor", "chipset", "cpu"]);

  return {
    price: Number(product?.basePrice ?? product?.variants?.[0]?.price ?? product?.price ?? 0),
    rating: Number(product?.rating || 0),
    warranty: Number(product?.warrantyMonths || 0),
    reviews: Number(product?.numReviews || 0),
    ram: parseMemoryToGB(getLookupValue(product, ["ram", "memory"])),
    storage: parseMemoryToGB(getLookupValue(product, ["storage", "rom", "ssd_capacity"])),
    refreshRate: parseRefreshRate(getLookupValue(product, ["refresh_rate", "display", "screen"])),
    displaySize: parseDisplaySize(getLookupValue(product, ["display_size", "display", "screen"])),
    batteryMah: parseBatteryMah(batteryText),
    batteryHours: parseBatteryHours(getLookupValue(product, ["battery_life", "battery"])),
    cameraMp: parseCameraMP(cameraText),
    resolutionScore: getResolutionScore(displayText),
    panelScore: getPanelScore(displayText),
    processorScore: getProcessorScore(processorText),
  };
};

const getAvailability = (product) => {
  const variants = product?.variants || [];
  if (!variants.length) return "Available";
  const inStock = variants.some((v) => Number((v?.availableStock ?? v?.countInStock) || 0) > 0);
  return inStock ? "In stock" : "Out of stock";
};

const getAvailabilityScore = (product) => (getAvailability(product) === "In stock" ? 1 : 0);

const getImage = (product, fallback) =>
  product?.variants?.[0]?.images?.[0]?.url ||
  product?.images?.[0]?.url ||
  fallback;

const getCategoryFamily = (label) => {
  const text = String(label || "").toLowerCase();
  if (/(phone|smartphone|mobile)/.test(text)) return "phone";
  if (/(laptop|notebook|ultrabook)/.test(text)) return "laptop";
  if (/(monitor|display)/.test(text)) return "monitor";
  if (/(tv|television)/.test(text)) return "tv";
  if (/(camera|dslr|mirrorless)/.test(text)) return "camera";
  if (/(watch|wearable)/.test(text)) return "watch";
  if (/(audio|speaker|earbud|headphone|headset)/.test(text)) return "audio";
  return "default";
};

const getMetricsForFamily = (family) => {
  const common = [
    {
      id: "price",
      label: "Price",
      weight: 24,
      direction: "low",
      getValue: (signals) => signals.price,
      format: (value) => money(value),
    },
    {
      id: "rating",
      label: "Rating",
      weight: 18,
      direction: "high",
      getValue: (signals) => signals.rating,
      format: (value) => `${Number(value || 0).toFixed(1)}/5`,
    },
    {
      id: "warranty",
      label: "Warranty",
      weight: 8,
      direction: "high",
      getValue: (signals) => signals.warranty,
      format: (value) => (value ? `${value} mo` : "-"),
    },
    {
      id: "availability",
      label: "Availability",
      weight: 6,
      direction: "high",
      getValue: (_, product) => getAvailabilityScore(product),
      format: (_, product) => getAvailability(product),
    },
  ];

  if (family === "phone") {
    return [
      common[0],
      common[1],
      {
        id: "ram",
        label: "RAM",
        weight: 14,
        direction: "high",
        getValue: (signals) => signals.ram,
        format: (value) => (value ? `${value} GB` : "-"),
      },
      {
        id: "storage",
        label: "Storage",
        weight: 12,
        direction: "high",
        getValue: (signals) => signals.storage,
        format: (value) => (value ? `${value} GB` : "-"),
      },
      {
        id: "refreshRate",
        label: "Refresh rate",
        weight: 9,
        direction: "high",
        getValue: (signals) => signals.refreshRate,
        format: (value) => (value ? `${value} Hz` : "-"),
      },
      {
        id: "battery",
        label: "Battery",
        weight: 10,
        direction: "high",
        getValue: (signals) => signals.batteryMah || signals.batteryHours,
        format: (_, product, signals) => {
          if (signals.batteryMah) return `${signals.batteryMah} mAh`;
          if (signals.batteryHours) return `${signals.batteryHours} hrs`;
          return "-";
        },
      },
      {
        id: "cameraMp",
        label: "Camera",
        weight: 9,
        direction: "high",
        getValue: (signals) => signals.cameraMp,
        format: (value) => (value ? `${value} MP` : "-"),
      },
      common[2],
      common[3],
    ];
  }

  if (family === "laptop") {
    return [
      common[0],
      common[1],
      {
        id: "processorScore",
        label: "Processor",
        weight: 16,
        direction: "high",
        getValue: (signals) => signals.processorScore,
        format: (_, product) => getLookupValue(product, ["processor", "chipset", "cpu"]) || "-",
      },
      {
        id: "ram",
        label: "RAM",
        weight: 12,
        direction: "high",
        getValue: (signals) => signals.ram,
        format: (value) => (value ? `${value} GB` : "-"),
      },
      {
        id: "storage",
        label: "Storage",
        weight: 12,
        direction: "high",
        getValue: (signals) => signals.storage,
        format: (value) => (value ? `${value} GB` : "-"),
      },
      {
        id: "battery",
        label: "Battery life",
        weight: 10,
        direction: "high",
        getValue: (signals) => signals.batteryHours || signals.batteryMah,
        format: (_, product, signals) => {
          if (signals.batteryHours) return `${signals.batteryHours} hrs`;
          if (signals.batteryMah) return `${signals.batteryMah} mAh`;
          return "-";
        },
      },
      {
        id: "displaySize",
        label: "Display",
        weight: 8,
        direction: "high",
        getValue: (signals) => signals.displaySize,
        format: (value) => (value ? `${value}"` : "-"),
      },
      common[2],
      common[3],
    ];
  }

  if (family === "monitor" || family === "tv") {
    return [
      common[0],
      common[1],
      {
        id: "displaySize",
        label: "Display size",
        weight: 18,
        direction: "high",
        getValue: (signals) => signals.displaySize,
        format: (value) => (value ? `${value}"` : "-"),
      },
      {
        id: "refreshRate",
        label: "Refresh rate",
        weight: 16,
        direction: "high",
        getValue: (signals) => signals.refreshRate,
        format: (value) => (value ? `${value} Hz` : "-"),
      },
      {
        id: "resolutionScore",
        label: "Resolution",
        weight: 14,
        direction: "high",
        getValue: (signals) => signals.resolutionScore,
        format: (_, product) => getLookupValue(product, ["display_resolution", "display", "screen"]) || "-",
      },
      {
        id: "panelScore",
        label: "Panel quality",
        weight: 10,
        direction: "high",
        getValue: (signals) => signals.panelScore,
        format: (_, product) => getLookupValue(product, ["display_type", "display", "screen"]) || "-",
      },
      common[2],
      common[3],
    ];
  }

  if (family === "camera") {
    return [
      common[0],
      common[1],
      {
        id: "cameraMp",
        label: "Sensor",
        weight: 18,
        direction: "high",
        getValue: (signals) => signals.cameraMp,
        format: (value) => (value ? `${value} MP` : "-"),
      },
      {
        id: "processorScore",
        label: "Image engine",
        weight: 12,
        direction: "high",
        getValue: (signals) => signals.processorScore,
        format: (_, product) => getLookupValue(product, ["processor", "chipset"]) || "-",
      },
      {
        id: "battery",
        label: "Battery",
        weight: 10,
        direction: "high",
        getValue: (signals) => signals.batteryHours || signals.batteryMah,
        format: (_, product, signals) => {
          if (signals.batteryHours) return `${signals.batteryHours} hrs`;
          if (signals.batteryMah) return `${signals.batteryMah} mAh`;
          return "-";
        },
      },
      common[2],
      common[3],
    ];
  }

  return [
    common[0],
    common[1],
    {
      id: "reviews",
      label: "Review volume",
      weight: 12,
      direction: "high",
      getValue: (signals) => signals.reviews,
      format: (value) => `${value || 0} reviews`,
    },
    common[2],
    common[3],
  ];
};

const getMetricLeaders = (metric, entries) => {
  const validEntries = entries.filter((entry) => Number(entry.metricValues[metric.id] || 0) > 0);
  if (!validEntries.length) return [];
  const values = validEntries.map((entry) => Number(entry.metricValues[metric.id] || 0));
  const target =
    metric.direction === "low"
      ? Math.min(...values)
      : Math.max(...values);
  return validEntries
    .filter((entry) => Number(entry.metricValues[metric.id] || 0) === target)
    .map((entry) => entry.index);
};

const scoreMetric = (metric, value, values) => {
  const validValues = values.filter((item) => Number(item || 0) > 0);
  if (!validValues.length || !Number(value || 0)) return 0;

  const max = Math.max(...validValues);
  const min = Math.min(...validValues);
  if (max === min) return metric.weight;

  if (metric.direction === "low") {
    const normalized = (max - value) / (max - min);
    return Math.max(0, Math.min(metric.weight, normalized * metric.weight));
  }

  const normalized = (value - min) / (max - min);
  return Math.max(0, Math.min(metric.weight, normalized * metric.weight));
};

const getComparisonNarrative = (family, bestOverall, bestValue, lowestPrice, strongestSpecs) => {
  const familyLabel =
    family === "phone"
      ? "phone"
      : family === "laptop"
        ? "laptop"
        : family === "monitor"
          ? "monitor"
          : family === "tv"
            ? "TV"
            : "product";

  if (!bestOverall) return "";

  if (bestOverall.index === bestValue?.index) {
    return `${bestOverall.product?.name} stands out as the best ${familyLabel} overall and also delivers the strongest value among the current picks.`;
  }

  if (bestOverall.index === lowestPrice?.index) {
    return `${bestOverall.product?.name} leads this ${familyLabel} comparison while also being the cheapest option, which makes it the most straightforward recommendation.`;
  }

  if (strongestSpecs && bestOverall.index !== strongestSpecs.index) {
    return `${bestOverall.product?.name} is the most balanced choice overall, while ${strongestSpecs.product?.name} pushes harder on raw specs.`;
  }

  return `${bestOverall.product?.name} is the most balanced pick in this ${familyLabel} comparison based on price, rating, and the specs that matter most for the category.`;
};

const buildComparisonModel = (products) => {
  if (!products.length) {
    return {
      family: "default",
      metrics: [],
      entries: [],
      bestOverall: null,
      bestValue: null,
      lowestPrice: null,
      strongestSpecs: null,
      highlights: [],
      narrative: "",
    };
  }

  const categoryLabel = getCompareCategory(products[0]).name;
  const family = getCategoryFamily(categoryLabel);
  const metrics = getMetricsForFamily(family);

  const entries = products.map((product, index) => {
    const signals = getProductSignals(product);
    const metricValues = metrics.reduce((acc, metric) => {
      acc[metric.id] = metric.getValue(signals, product);
      return acc;
    }, {});
    return {
      index,
      product,
      signals,
      metricValues,
      totalScore: 0,
      featureScore: 0,
      scoreLabel: "",
      topReasons: [],
    };
  });

  const metricValuesMap = metrics.reduce((acc, metric) => {
    acc[metric.id] = entries.map((entry) => Number(entry.metricValues[metric.id] || 0));
    return acc;
  }, {});

  const metricLeaders = metrics.reduce((acc, metric) => {
    acc[metric.id] = getMetricLeaders(metric, entries);
    return acc;
  }, {});

  const scoredEntries = entries.map((entry) => {
    const scoredMetrics = metrics.map((metric) => {
      const value = Number(entry.metricValues[metric.id] || 0);
      const score = scoreMetric(metric, value, metricValuesMap[metric.id]);
      return {
        ...metric,
        value,
        score,
        isLeader: metricLeaders[metric.id].includes(entry.index),
        displayValue: metric.format(value, entry.product, entry.signals),
      };
    });

    const totalScore = scoredMetrics.reduce((sum, metric) => sum + metric.score, 0);
    const featureScore = scoredMetrics
      .filter((metric) => metric.id !== "price")
      .reduce((sum, metric) => sum + metric.score, 0);

    const topReasons = scoredMetrics
      .filter((metric) => metric.isLeader && metric.id !== "price")
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 2)
      .map((metric) => metric.label);

    return {
      ...entry,
      scoredMetrics,
      totalScore,
      featureScore,
      scoreLabel: `${Math.round(totalScore)}/100`,
      topReasons,
    };
  });

  const sortedByOverall = [...scoredEntries].sort((a, b) => b.totalScore - a.totalScore);
  const sortedByValue = [...scoredEntries].sort((a, b) => {
    const priceA = Math.max(a.signals.price || 1, 1);
    const priceB = Math.max(b.signals.price || 1, 1);
    return b.featureScore / priceB - a.featureScore / priceA;
  });
  const sortedByPrice = [...scoredEntries].sort((a, b) => a.signals.price - b.signals.price);
  const sortedBySpecs = [...scoredEntries].sort((a, b) => b.featureScore - a.featureScore);

  const highlightMetrics = metrics
    .filter((metric) => metric.id !== "availability")
    .slice(0, 4)
    .map((metric) => ({
      ...metric,
      leaders: metricLeaders[metric.id]
        .map((index) => scoredEntries.find((entry) => entry.index === index))
        .filter(Boolean),
    }));

  return {
    family,
    metrics,
    entries: scoredEntries,
    bestOverall: sortedByOverall[0] || null,
    bestValue: sortedByValue[0] || null,
    lowestPrice: sortedByPrice[0] || null,
    strongestSpecs: sortedBySpecs[0] || null,
    highlights: highlightMetrics,
    narrative: getComparisonNarrative(
      family,
      sortedByOverall[0],
      sortedByValue[0],
      sortedByPrice[0],
      sortedBySpecs[0]
    ),
  };
};

const getScoreTone = (entry, bestOverall) => {
  if (!entry) return "border-white/60 bg-white/90";
  if (bestOverall && entry.index === bestOverall.index) {
    return "border-emerald-200 bg-emerald-50/90";
  }
  return "border-white/60 bg-white/90";
};

export default function Compare() {
  const compareItems = useCompareItems();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!compareItems.length) {
        setProducts([]);
        return;
      }

      setLoading(true);
      const results = await Promise.all(
        compareItems.map(async (item) => {
          if (!item?.slug && !item?.id) return null;
          const path = item.slug ? `/products/${item.slug}` : `/products/id/${item.id}`;
          try {
            const { data } = await api.get(path);
            return data || null;
          } catch {
            return null;
          }
        })
      );

      if (!active) return;
      setProducts(results);
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [compareItems]);

  const safeProducts = useMemo(() => {
    return compareItems.map((item, index) => {
      const product = products[index];
      if (product) return product;
      return {
        _missing: true,
        name: item?.name || "Unavailable product",
        slug: item?.slug,
        _id: item?.id,
        brand: { name: item?.brand || "" },
        category: item?.categoryName
          ? {
              _id: item?.categoryId || "",
              slug: item?.categorySlug || "",
              name: item.categoryName,
            }
          : null,
        basePrice: item?.price ?? 0,
        images: item?.image ? [{ url: item.image }] : [],
        variants: [],
        specs: {},
      };
    });
  }, [compareItems, products]);

  const attributeKeys = useMemo(() => {
    const keys = new Set();
    safeProducts.forEach((product) => {
      Object.keys(getAttributeMap(product)).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [safeProducts]);

  const specKeys = useMemo(() => {
    const keys = new Set();
    safeProducts.forEach((product) => {
      Object.keys(getSpecsMap(product)).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [safeProducts]);

  const compareCategoryGroups = useMemo(() => {
    const groups = new Map();
    safeProducts.forEach((product, index) => {
      const category = getCompareCategory(product);
      const key = category.key || "__uncategorized__";
      const current = groups.get(key) || {
        label: category.name || "Uncategorized",
        indexes: [],
      };
      current.indexes.push(index);
      groups.set(key, current);
    });
    return Array.from(groups.values());
  }, [safeProducts]);

  const hasMixedCategories = compareCategoryGroups.length > 1;
  const recommendedCategory = compareCategoryGroups[0]?.label || "";
  const comparison = useMemo(
    () => (!hasMixedCategories ? buildComparisonModel(safeProducts) : null),
    [hasMixedCategories, safeProducts]
  );

  const labelCell =
    "px-4 py-3 font-semibold text-gray-700 bg-white/90 border border-white/60 first:rounded-l-2xl dark:bg-slate-900/80 dark:text-slate-200 dark:border-slate-800/60";
  const valueCell =
    "px-4 py-3 text-gray-800 bg-white/90 border border-white/60 last:rounded-r-2xl dark:bg-slate-900/80 dark:text-slate-100 dark:border-slate-800/60";

  const overviewRows = comparison
    ? [
        {
          id: "score",
          label: "Overall score",
          metricId: null,
          render: (entry) => entry.scoreLabel,
          className: "font-extrabold text-emerald-700",
        },
        {
          id: "price",
          label: "Price",
          metricId: "price",
          render: (entry) => money(entry.signals.price),
          className: "font-extrabold text-indigo-600",
        },
        {
          id: "brand",
          label: "Brand",
          metricId: null,
          render: (entry) => entry.product?.brand?.name || entry.product?.brand || "-",
        },
        {
          id: "category",
          label: "Category",
          metricId: null,
          render: (entry) => entry.product?.category?.name || "-",
        },
        {
          id: "availability",
          label: "Availability",
          metricId: "availability",
          render: (entry) => getAvailability(entry.product),
        },
        {
          id: "rating",
          label: "Rating",
          metricId: "rating",
          render: (entry) => `${entry.signals.rating.toFixed(1)} (${entry.signals.reviews || 0})`,
        },
        {
          id: "warranty",
          label: "Warranty",
          metricId: "warranty",
          render: (entry) => (entry.signals.warranty ? `${entry.signals.warranty} mo` : "-"),
        },
        {
          id: "reasons",
          label: "Why it stands out",
          metricId: null,
          render: (entry) => (entry.topReasons.length ? entry.topReasons.join(" + ") : "Balanced overall"),
        },
      ]
    : [];

  if (!compareItems.length) {
    return (
      <div className="page-ambient min-h-screen">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="premium-card rounded-3xl p-8 text-center">
            <p className="text-lg font-extrabold text-gray-900">No products selected</p>
            <p className="mt-2 text-sm text-gray-600">
              Add up to {COMPARE_LIMIT} products from the catalog to compare side by side.
            </p>
            <Link
              to="/products"
              className="mt-5 inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
            >
              Browse products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-ambient min-h-screen">
      <header className="relative overflow-hidden bg-[#0b1220] py-10 text-white shadow-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.2),transparent_26rem),radial-gradient(circle_at_left,rgba(251,191,36,0.18),transparent_24rem)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-black/20 blur-3xl" />
        <div className="max-w-7xl mx-auto flex flex-col gap-5 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="section-kicker text-cyan-200/80">Compare</p>
            <h1 className="text-2xl font-extrabold sm:text-3xl">Product Comparison</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/70">
              Compare products side by side within the same category, with a clear recommendation
              instead of only a raw spec table.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/20">
                Selected: {compareItems.length}/{COMPARE_LIMIT}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/20">
                Rows: {attributeKeys.length + specKeys.length + 8}
              </span>
              {comparison ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-200/20">
                  Best overall: {comparison.bestOverall?.product?.name || "-"}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/products"
              className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Add more
            </Link>
            <button
              type="button"
              onClick={clearCompareItems}
              className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25"
            >
              Clear all
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6">
        <div className="premium-card rounded-[2rem] border border-white/60 bg-white/70 p-5 shadow-2xl backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/70 sm:p-6">
          {hasMixedCategories ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Comparison works within one category only. Keep products from{" "}
              <span className="font-bold">{recommendedCategory}</span> and remove the rest, or clear
              the list and start again.
            </div>
          ) : null}

          {loading ? (
            <div className="text-sm text-gray-500">Loading comparison data...</div>
          ) : (
            <>
              {comparison ? (
                <div className="mb-8 space-y-6">
                  <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
                    <div className="rounded-[1.75rem] border border-emerald-200 bg-[linear-gradient(135deg,rgba(236,253,245,0.95),rgba(219,234,254,0.92))] p-5 shadow-lg">
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">
                        Recommendation
                      </p>
                      <p className="mt-3 text-2xl font-extrabold text-slate-900">
                        {comparison.bestOverall?.product?.name || "No winner yet"}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        {comparison.narrative}
                      </p>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Overall score {comparison.bestOverall?.scoreLabel || "-"}
                      </p>
                    </div>

                    {[
                      {
                        label: "Best value",
                        entry: comparison.bestValue,
                        tone: "border-cyan-200 bg-cyan-50/90 text-cyan-950",
                      },
                      {
                        label: "Lowest price",
                        entry: comparison.lowestPrice,
                        tone: "border-indigo-200 bg-indigo-50/90 text-indigo-950",
                      },
                      {
                        label: "Strongest specs",
                        entry: comparison.strongestSpecs,
                        tone: "border-amber-200 bg-amber-50/90 text-amber-950",
                      },
                    ].map((card) => (
                      <div
                        key={card.label}
                        className={`rounded-[1.5rem] border p-4 shadow-sm ${card.tone}`}
                      >
                        <p className="text-xs font-bold uppercase tracking-[0.22em]">{card.label}</p>
                        <p className="mt-3 text-lg font-extrabold">{card.entry?.product?.name || "-"}</p>
                        <p className="mt-2 text-sm opacity-80">
                          {card.label === "Lowest price"
                            ? money(card.entry?.signals?.price || 0)
                            : card.entry?.topReasons?.join(" + ") || card.entry?.scoreLabel || "-"}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[1.75rem] border border-slate-200 bg-white/85 p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                          Decision signals
                        </p>
                        <p className="mt-1 text-lg font-extrabold text-slate-900">
                          What is driving the result
                        </p>
                      </div>
                      <p className="text-sm text-slate-500">
                        Category-aware weights based on {recommendedCategory || "this category"}
                      </p>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {comparison.highlights.map((metric) => (
                        <div
                          key={metric.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                        >
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                            {metric.label}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {metric.leaders.map((entry) => entry.product?.name).join(", ") || "No leader"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <table className="min-w-[920px] w-full border-separate border-spacing-y-3 text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="w-56 px-4 py-3 text-xs uppercase tracking-[0.2em] text-gray-500">
                        Feature
                      </th>
                      {(comparison?.entries || safeProducts.map((product, index) => ({ product, index }))).map(
                        (entry, idx) => {
                          const product = entry.product;
                          return (
                            <th key={getCompareKey(product) || idx} className="px-4 py-3 align-top">
                              <div
                                className={`flex flex-col gap-3 rounded-3xl border p-3 shadow-lg dark:border-slate-800/60 dark:bg-slate-900/80 ${getScoreTone(
                                  comparison?.entries?.[idx],
                                  comparison?.bestOverall
                                )}`}
                              >
                                <div className="relative overflow-hidden rounded-2xl">
                                  <img
                                    src={getImage(product, fallbackImg)}
                                    alt={product?.name}
                                    className="h-32 w-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = fallbackImg;
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
                                  <button
                                    type="button"
                                    onClick={() => removeCompareItem(getCompareKey(product))}
                                    className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-rose-600 shadow"
                                  >
                                    Remove
                                  </button>
                                  <span className="absolute bottom-2 left-2 rounded-full bg-slate-900/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                                    {getAvailability(product)}
                                  </span>
                                  {comparison?.bestOverall?.index === idx ? (
                                    <span className="absolute bottom-2 right-2 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                                      Top pick
                                    </span>
                                  ) : null}
                                </div>
                                <div>
                                  <p className="line-clamp-2 font-extrabold text-gray-900 dark:text-slate-100">
                                    {product?.name}
                                  </p>
                                  {comparison?.entries?.[idx] ? (
                                    <p className="mt-1 text-xs font-semibold text-emerald-700">
                                      Overall score: {comparison.entries[idx].scoreLabel}
                                    </p>
                                  ) : null}
                                  {product?._missing ? (
                                    <p className="text-xs text-rose-500">Currently unavailable</p>
                                  ) : (
                                    <Link
                                      to={product?.slug ? `/product/${product.slug}` : `/product/${product?._id}`}
                                      className="text-xs font-semibold text-indigo-600 hover:underline"
                                    >
                                      View product
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </th>
                          );
                        }
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {comparison
                      ? overviewRows.map((row) => (
                          <tr key={row.id}>
                            <td className={labelCell}>{row.label}</td>
                            {comparison.entries.map((entry) => {
                              const isLeader = row.metricId
                                ? comparison.highlights
                                    .find((metric) => metric.id === row.metricId)
                                    ?.leaders.some((leader) => leader.index === entry.index)
                                : comparison.bestOverall?.index === entry.index && row.id === "score";
                              return (
                                <td
                                  key={`${row.id}-${entry.index}`}
                                  className={`${valueCell} ${row.className || ""} ${
                                    isLeader ? "ring-2 ring-emerald-200" : ""
                                  }`}
                                >
                                  {row.render(entry)}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      : null}

                    {attributeKeys.length > 0 && (
                      <tr>
                        <td
                          colSpan={safeProducts.length + 1}
                          className="px-4 py-4 text-xs font-bold uppercase tracking-[0.2em] text-gray-500"
                        >
                          Default Variant Attributes
                        </td>
                      </tr>
                    )}
                    {attributeKeys.map((key) => (
                      <tr key={`attr-${key}`}>
                        <td className={labelCell}>{prettyAttrKey(key)}</td>
                        {safeProducts.map((product, idx) => (
                          <td key={`attr-${key}-${idx}`} className={valueCell}>
                            {getAttributeMap(product)[key] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {specKeys.length > 0 && (
                      <tr>
                        <td
                          colSpan={safeProducts.length + 1}
                          className="px-4 py-4 text-xs font-bold uppercase tracking-[0.2em] text-gray-500"
                        >
                          Product Specs
                        </td>
                      </tr>
                    )}
                    {specKeys.map((key) => (
                      <tr key={`spec-${key}`}>
                        <td className={labelCell}>{prettyAttrKey(key)}</td>
                        {safeProducts.map((product, idx) => (
                          <td key={`spec-${key}-${idx}`} className={valueCell}>
                            {getSpecsMap(product)[key] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
