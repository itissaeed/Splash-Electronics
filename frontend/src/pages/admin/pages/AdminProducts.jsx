import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../../../utils/api";
import {
  ArrowLeft,
  Plus,
  Copy,
  Upload,
  Download,
  Pencil,
  Trash2,
  X,
  Check,
  Image as ImageIcon,
  Search,
  Tag,
  Shapes,
  Loader2,
} from "lucide-react";

const fallbackImg =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&auto=format&fit=crop&q=60";
const PRODUCT_CREATE_DRAFT_KEY = "admin_product_create_draft_v1";
const PRODUCT_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];
const BULK_IMPORT_TEMPLATE = [
  "name,slug,brand,category,description,sku,price,stock,publicationStatus,defaultVariant,imageUrls,highlights,color,ram,storage,spec_display_size,spec_chipset",
  '"Galaxy A55","galaxy-a55","Samsung","Smartphones","Balanced midrange phone","GALAXY-A55-128-BLK",45999,14,published,yes,"https://example.com/a55-blue-front.jpg|https://example.com/a55-blue-back.jpg","AMOLED display|Long battery life","Awesome Iceblue","8GB","128GB","6.6 inch","Exynos 1480"',
  '"Galaxy A55","galaxy-a55","Samsung","Smartphones","Balanced midrange phone","GALAXY-A55-256-NVY",51999,9,published,no,"https://example.com/a55-navy-front.jpg","AMOLED display|Long battery life","Awesome Navy","8GB","256GB","6.6 inch","Exynos 1480"',
].join("\n");

const moneyBDT = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "৳0";
  return `৳${num.toLocaleString("en-BD")}`;
};

const slugify = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const getPublicationStatus = (productLike) => {
  const normalized = String(productLike?.publicationStatus || "")
    .trim()
    .toLowerCase();
  if (["draft", "published", "archived"].includes(normalized)) return normalized;
  return productLike?.isActive ? "published" : "draft";
};

const getStatusBadgeClassName = (status) => {
  if (status === "published") return "bg-green-50 text-green-700";
  if (status === "archived") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

const parseBooleanCell = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
};

const splitPipeValues = (value) =>
  String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

const isLikelyUrl = (value) => {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const parseKeyValueList = (value) =>
  String(value || "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const idx = item.indexOf(":");
      if (idx < 0) return acc;
      const key = toAttributeKey(item.slice(0, idx));
      const parsedValue = item.slice(idx + 1).trim();
      if (key && parsedValue) acc[key] = parsedValue;
      return acc;
    }, {});

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
};

const parseCsvText = (text) => {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (!lines.length) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]).map((header) => String(header || "").trim());
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row = headers.reduce((acc, header, headerIndex) => {
      acc[header] = values[headerIndex] ?? "";
      return acc;
    }, {});

    return {
      rowNumber: index + 2,
      values: row,
    };
  });

  return { headers, rows };
};

const DEFAULT_VARIANT_ATTRIBUTE_KEYS = ["color", "ram", "storage"];
const PHONE_KEYS = [
  "color",
  "ram",
  "storage",
  "display_size",
  "display_type",
  "refresh_rate",
  "chipset",
  "battery_capacity",
  "charging_power",
  "camera_main",
  "camera_selfie",
  "network",
  "sim_type",
  "os",
];
const LAPTOP_KEYS = [
  "color",
  "processor",
  "ram",
  "storage",
  "storage_type",
  "display_size",
  "display_resolution",
  "refresh_rate",
  "gpu",
  "battery_capacity",
  "weight",
  "os",
];
const TABLET_KEYS = [
  "color",
  "ram",
  "storage",
  "display_size",
  "display_type",
  "chipset",
  "battery_capacity",
  "network",
  "sim_support",
  "os",
];
const AUDIO_KEYS = [
  "color",
  "connectivity",
  "bluetooth_version",
  "driver_size",
  "noise_cancellation",
  "microphone",
  "battery_life",
  "charging_port",
  "water_resistance",
];
const CATEGORY_ATTRIBUTE_PRESETS = {
  smartphone: PHONE_KEYS,
  smartphones: PHONE_KEYS,
  phone: PHONE_KEYS,
  phones: PHONE_KEYS,
  mobile: PHONE_KEYS,
  mobile_phone: PHONE_KEYS,

  laptop: LAPTOP_KEYS,
  laptops: LAPTOP_KEYS,
  notebook: LAPTOP_KEYS,
  notebooks: LAPTOP_KEYS,

  tablet: TABLET_KEYS,
  tablets: TABLET_KEYS,
  tab: TABLET_KEYS,
  tabs: TABLET_KEYS,

  monitor: [
    "size",
    "panel_type",
    "resolution",
    "refresh_rate",
    "response_time",
    "brightness",
    "connectivity",
    "color_gamut",
  ],
  monitors: [
    "size",
    "panel_type",
    "resolution",
    "refresh_rate",
    "response_time",
    "brightness",
    "connectivity",
    "color_gamut",
  ],

  keyboard: [
    "color",
    "switch_type",
    "layout",
    "size",
    "connectivity",
    "backlight",
    "keycaps",
  ],
  keyboards: [
    "color",
    "switch_type",
    "layout",
    "size",
    "connectivity",
    "backlight",
    "keycaps",
  ],
  mouse: ["color", "dpi", "sensor", "connectivity", "buttons", "weight", "battery_life"],
  mice: ["color", "dpi", "sensor", "connectivity", "buttons", "weight", "battery_life"],
  headset: AUDIO_KEYS,
  headsets: AUDIO_KEYS,
  earbuds: AUDIO_KEYS,
  earbud: AUDIO_KEYS,
  headphone: AUDIO_KEYS,
  headphones: AUDIO_KEYS,

  smartwatch: [
    "color",
    "size",
    "display_type",
    "strap_material",
    "bluetooth_version",
    "battery_life",
    "water_resistance",
    "gps",
  ],
  smartwatches: [
    "color",
    "size",
    "display_type",
    "strap_material",
    "bluetooth_version",
    "battery_life",
    "water_resistance",
    "gps",
  ],

  charger: ["color", "port_type", "ports", "output_power", "fast_charging", "cable_included"],
  chargers: ["color", "port_type", "ports", "output_power", "fast_charging", "cable_included"],
  power_bank: ["color", "capacity", "ports", "output_power", "fast_charging", "weight"],
  powerbank: ["color", "capacity", "ports", "output_power", "fast_charging", "weight"],
  cable: ["color", "connector_type", "length", "material", "max_power", "data_speed"],
  cables: ["color", "connector_type", "length", "material", "max_power", "data_speed"],

  ssd: ["capacity", "form_factor", "interface", "read_speed", "write_speed", "warranty_years"],
  hdd: ["capacity", "rpm", "cache", "form_factor", "interface", "warranty_years"],
  ram: ["capacity", "memory_type", "speed", "latency", "voltage", "heatsink"],
  motherboard: ["socket", "chipset", "form_factor", "ram_type", "max_ram", "pcie_version"],
  graphics_card: ["vram", "memory_type", "boost_clock", "length", "tdp", "power_connector"],
  gpu: ["vram", "memory_type", "boost_clock", "length", "tdp", "power_connector"],
  processor: ["cores", "threads", "base_clock", "boost_clock", "cache", "tdp", "socket"],
  cpu: ["cores", "threads", "base_clock", "boost_clock", "cache", "tdp", "socket"],
};

const toAttributeKey = (text) =>
  String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");

const formatAttributeLabel = (key) =>
  String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const getKeyboardNavigableFields = (container) => {
  if (!container) return [];
  const selectors = [
    "input:not([type='hidden']):not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "button:not([disabled])",
  ].join(",");
  return Array.from(container.querySelectorAll(selectors)).filter(
    (el) => el.tabIndex !== -1 && el.offsetParent !== null
  );
};

const getPresetAttributeKeys = (categoryLike) => {
  const slugKey = toAttributeKey(categoryLike?.slug);
  if (slugKey && CATEGORY_ATTRIBUTE_PRESETS[slugKey]) {
    return CATEGORY_ATTRIBUTE_PRESETS[slugKey];
  }
  const nameKey = toAttributeKey(categoryLike?.name);
  if (nameKey && CATEGORY_ATTRIBUTE_PRESETS[nameKey]) {
    return CATEGORY_ATTRIBUTE_PRESETS[nameKey];
  }
  return [];
};

const CATEGORY_INFO_PRESETS = {
  smartphone: {
    highlights: [
      "Powerful chipset for smooth daily and gaming performance",
      "Long battery life with fast charging support",
      "High refresh rate display with vivid colors",
      "Advanced camera system for day and night shots",
    ],
    specs: {
      display: "AMOLED, FHD+, 120Hz",
      chipset: "",
      ram: "",
      storage: "",
      rear_camera: "",
      front_camera: "",
      battery: "",
      charging: "",
      network: "5G",
      os: "",
    },
  },
  laptop: {
    highlights: [
      "Balanced performance for work, study, and multitasking",
      "Fast SSD storage for quick boot and app load times",
      "Comfortable keyboard and large precision touchpad",
      "Reliable battery backup for all-day use",
    ],
    specs: {
      processor: "",
      ram: "",
      storage: "",
      display: "",
      graphics: "",
      battery: "",
      weight: "",
      os: "",
    },
  },
  tablet: {
    highlights: [
      "Large immersive display for media and productivity",
      "Slim and lightweight design for portability",
      "Strong battery life for full-day usage",
      "Smooth app and multitasking experience",
    ],
    specs: {
      display: "",
      chipset: "",
      ram: "",
      storage: "",
      battery: "",
      connectivity: "",
      os: "",
    },
  },
  monitor: {
    highlights: [
      "Crisp panel with strong color accuracy",
      "Fast refresh rate and low response time",
      "Comfortable viewing with eye-care features",
      "Multiple connectivity options for flexible setup",
    ],
    specs: {
      size: "",
      panel_type: "",
      resolution: "",
      refresh_rate: "",
      response_time: "",
      brightness: "",
      ports: "",
    },
  },
  keyboard: {
    highlights: [
      "Comfortable typing with durable key switches",
      "Optimized layout for productivity and gaming",
      "Stable build quality with long key life",
      "Reliable wired/wireless connectivity",
    ],
    specs: {
      switch_type: "",
      layout: "",
      size: "",
      connectivity: "",
      backlight: "",
      keycaps: "",
    },
  },
  mouse: {
    highlights: [
      "Accurate sensor for precise control",
      "Ergonomic shape for long sessions",
      "Adjustable DPI for different workflows",
      "Low-latency connection for responsive input",
    ],
    specs: {
      sensor: "",
      dpi: "",
      buttons: "",
      weight: "",
      connectivity: "",
      battery_life: "",
    },
  },
  headset: {
    highlights: [
      "Clear audio with immersive sound stage",
      "Comfortable fit for extended sessions",
      "Stable wireless or wired connection",
      "Clear microphone pickup for calls and gaming",
    ],
    specs: {
      driver_size: "",
      connectivity: "",
      microphone: "",
      noise_cancellation: "",
      battery_life: "",
      charging_port: "",
    },
  },
  smartwatch: {
    highlights: [
      "Health and activity tracking with smart notifications",
      "Bright display with smooth touch response",
      "Durable build with water resistance",
      "Long battery life for daily wear",
    ],
    specs: {
      display: "",
      sensors: "",
      battery_life: "",
      water_resistance: "",
      connectivity: "",
      gps: "",
    },
  },
};

CATEGORY_INFO_PRESETS.smartphones = CATEGORY_INFO_PRESETS.smartphone;
CATEGORY_INFO_PRESETS.phone = CATEGORY_INFO_PRESETS.smartphone;
CATEGORY_INFO_PRESETS.phones = CATEGORY_INFO_PRESETS.smartphone;
CATEGORY_INFO_PRESETS.mobile = CATEGORY_INFO_PRESETS.smartphone;
CATEGORY_INFO_PRESETS.mobile_phone = CATEGORY_INFO_PRESETS.smartphone;
CATEGORY_INFO_PRESETS.laptops = CATEGORY_INFO_PRESETS.laptop;
CATEGORY_INFO_PRESETS.notebook = CATEGORY_INFO_PRESETS.laptop;
CATEGORY_INFO_PRESETS.notebooks = CATEGORY_INFO_PRESETS.laptop;
CATEGORY_INFO_PRESETS.tablets = CATEGORY_INFO_PRESETS.tablet;
CATEGORY_INFO_PRESETS.tab = CATEGORY_INFO_PRESETS.tablet;
CATEGORY_INFO_PRESETS.tabs = CATEGORY_INFO_PRESETS.tablet;
CATEGORY_INFO_PRESETS.monitors = CATEGORY_INFO_PRESETS.monitor;
CATEGORY_INFO_PRESETS.keyboards = CATEGORY_INFO_PRESETS.keyboard;
CATEGORY_INFO_PRESETS.mice = CATEGORY_INFO_PRESETS.mouse;
CATEGORY_INFO_PRESETS.headsets = CATEGORY_INFO_PRESETS.headset;
CATEGORY_INFO_PRESETS.earbuds = CATEGORY_INFO_PRESETS.headset;
CATEGORY_INFO_PRESETS.earbud = CATEGORY_INFO_PRESETS.headset;
CATEGORY_INFO_PRESETS.headphone = CATEGORY_INFO_PRESETS.headset;
CATEGORY_INFO_PRESETS.headphones = CATEGORY_INFO_PRESETS.headset;
CATEGORY_INFO_PRESETS.smartwatches = CATEGORY_INFO_PRESETS.smartwatch;

const getPresetInfoTemplate = (categoryLike) => {
  const localSlugKey = toAttributeKey(categoryLike?.slug);
  const localNameKey = toAttributeKey(categoryLike?.name);
  const localTemplate =
    (localSlugKey && CATEGORY_INFO_PRESETS[localSlugKey]) ||
    (localNameKey && CATEGORY_INFO_PRESETS[localNameKey]) ||
    null;

  const dbHighlights = Array.isArray(categoryLike?.highlightsTemplate)
    ? categoryLike.highlightsTemplate
    : [];

  const dbSpecsRaw = categoryLike?.specsTemplate;
  const dbSpecs =
    dbSpecsRaw instanceof Map
      ? Object.fromEntries(Array.from(dbSpecsRaw.entries()))
      : dbSpecsRaw && typeof dbSpecsRaw === "object"
        ? dbSpecsRaw
        : {};

  const merged = {
    highlights: dbHighlights.length ? dbHighlights : localTemplate?.highlights || [],
    specs: Object.keys(dbSpecs).length ? dbSpecs : localTemplate?.specs || {},
  };

  if (!merged.highlights.length && !Object.keys(merged.specs).length) {
    return null;
  }

  return merged;
};

const highlightsArrayToText = (highlights) =>
  (Array.isArray(highlights) ? highlights : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .join("\n");

const specsObjectToText = (specs) => {
  if (!specs || typeof specs !== "object") return "";
  const entries =
    specs instanceof Map ? Array.from(specs.entries()) : Object.entries(specs);
  return entries
    .map(([k, v]) => [toAttributeKey(k), String(v || "").trim()])
    .filter(([k]) => !!k)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
};

const parseHighlightsText = (rawText) =>
  String(rawText || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

const parseSpecsText = (rawText) =>
  String(rawText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((acc, line) => {
      const idx = line.indexOf(":");
      if (idx < 0) return acc;
      const left = line.slice(0, idx).trim();
      const right = line.slice(idx + 1).trim();
      const key = toAttributeKey(left);
      if (!key || !right) return acc;
      acc[key] = right;
      return acc;
    }, {});

const emptyVariant = (isDefault = false) => ({
  _id: null,
  sku: "",
  price: "",
  countInStock: "",
  lowStockThreshold: 5,
  isDefault,
  attributes: {},
  images: [],
});

const createEmptyFormData = () => ({
  name: "",
  slug: "",
  brand: "",
  category: "",
  description: "",
  highlightsText: "",
  specsText: "",
  basePrice: "",
  warrantyMonths: "",
  isFeatured: false,
  publicationStatus: "draft",
});

const createEmptyProductSnapshot = () => ({
  formData: createEmptyFormData(),
  variants: [emptyVariant(true)],
});

function Modal({ open, title, subtitle, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border overflow-hidden">
          <div className="p-5 border-b flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-extrabold text-gray-900">{title}</div>
              {subtitle && (
                <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminProducts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { productId } = useParams();
  const isCreatePage = location.pathname === "/admin/products/new";
  const isEditPage = Boolean(productId);
  const isEditorPage = isCreatePage || isEditPage;

  // data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [saving, setSaving] = useState(false);
  const [savingCategoryTemplate, setSavingCategoryTemplate] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const formSnapshotRef = useRef("");
  const hasHydratedEditorRef = useRef(false);

  // filters
  const [q, setQ] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [onlyActive, setOnlyActive] = useState(false);

  // edit state
  const [editingId, setEditingId] = useState(null);

  // quick add modal (brand/category)
  const [createType, setCreateType] = useState(null); // "brand" | "category" | null
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createAttributes, setCreateAttributes] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [bulkImportRows, setBulkImportRows] = useState([]);
  const [bulkImportFileName, setBulkImportFileName] = useState("");
  const [bulkImportSourceText, setBulkImportSourceText] = useState("");
  const [autoCreateImportDependencies, setAutoCreateImportDependencies] = useState(true);
  const [bulkImportFeedback, setBulkImportFeedback] = useState(null);
  const [importingProducts, setImportingProducts] = useState(false);

  // form
  const [formData, setFormData] = useState(createEmptyFormData);

  // variants
  const [variants, setVariants] = useState([emptyVariant(true)]);

  // ✅ per-variant uploads: { [idx]: File[] }
  const [variantFiles, setVariantFiles] = useState({});
  const handleVariantFiles = (idx, filesList) => {
    const files = Array.from(filesList || []);
    setVariantFiles((prev) => ({ ...prev, [idx]: files }));
  };

  const applySnapshotToForm = ({ formData: nextFormData, variants: nextVariants }) => {
    setFormData({ ...createEmptyFormData(), ...(nextFormData || {}) });
    setVariants(Array.isArray(nextVariants) && nextVariants.length ? nextVariants : [emptyVariant(true)]);
    setVariantFiles({});
  };

  const markCurrentStateAsClean = (snapshotOverride) => {
    const snapshot =
      snapshotOverride ||
      JSON.stringify({
        formData,
        variants,
      });
    formSnapshotRef.current = snapshot;
    setIsDirty(false);
  };

  const resetForm = () => {
    setEditingId(null);
    applySnapshotToForm(createEmptyProductSnapshot());
    markCurrentStateAsClean(JSON.stringify(createEmptyProductSnapshot()));
    setSaving(false);
  };

  const openCreate = () => {
    resetForm();
    hasHydratedEditorRef.current = false;
    navigate("/admin/products/new");
  };

  const closeImportModal = () => {
    if (importingProducts) return;
    setIsImportModalOpen(false);
    setBulkImportRows([]);
    setBulkImportFileName("");
    setBulkImportSourceText("");
    setBulkImportFeedback(null);
  };

  const openImportModal = () => {
    setBulkImportFeedback(null);
    setBulkImportRows([]);
    setBulkImportFileName("");
    setBulkImportSourceText("");
    setIsImportModalOpen(true);
  };

  const fetchAll = async () => {
    try {
      setLoading(true);

      // IMPORTANT:
      // If your api baseURL already includes /api, keep "/products/admin"
      // If not, change to "/api/products/admin"
      const [pRes, cRes, bRes] = await Promise.all([
        api.get("/products/admin"),
        api.get("/categories"),
        api.get("/brands"),
      ]);

      setProducts(pRes.data?.products || []);
      setCategories(Array.isArray(cRes.data) ? cRes.data : []);
      setBrands(Array.isArray(bRes.data) ? bRes.data : []);
    } catch (e) {
      console.error(e);
      alert(
        e?.response?.data?.message ||
        "Failed to load admin data. Ensure GET /products/admin, /categories, /brands exist."
      );
    } finally {
      setLoading(false);
    }
  };

  const findEntityIdByCsvValue = (items, rawValue) => {
    const normalized = String(rawValue || "").trim().toLowerCase();
    if (!normalized) return "";

    const match = items.find((item) => {
      const id = String(item?._id || "").trim().toLowerCase();
      const slug = String(item?.slug || "").trim().toLowerCase();
      const name = String(item?.name || "").trim().toLowerCase();
      return normalized === id || normalized === slug || normalized === name;
    });

    return match?._id || "";
  };

  const buildBulkImportPreviewRows = (
    csvText,
    {
      brandsList = brands,
      categoriesList = categories,
      allowMissingDependencies = autoCreateImportDependencies,
    } = {}
  ) => {
    const parsed = parseCsvText(csvText);
    const existingSlugSet = new Set(products.map((product) => String(product?.slug || "").trim().toLowerCase()).filter(Boolean));
    const existingSkuSet = new Set(
      products
        .flatMap((product) => product?.variants || [])
        .map((variant) => String(variant?.sku || "").trim().toLowerCase())
        .filter(Boolean)
    );
    const rowEntries = parsed.rows.map(({ rowNumber, values }) => {
      const getValue = (key) => values[key] ?? values[key?.toLowerCase?.()] ?? "";
      const name = String(getValue("name")).trim();
      const slug = slugify(getValue("slug") || name);
      const brandLabel = String(getValue("brand")).trim();
      const categoryLabel = String(getValue("category")).trim();
      const brandId = findEntityIdByCsvValue(brandsList, brandLabel);
      const categoryId = findEntityIdByCsvValue(categoriesList, categoryLabel);
      const description = String(getValue("description")).trim();
      const sku = String(getValue("sku")).trim();
      const priceValue = Number(getValue("price") || getValue("basePrice") || 0);
      const stockValue = Number(getValue("stock") || getValue("countInStock") || 0);
      const lowStockThreshold = Number(getValue("lowStockThreshold") || 5);
      const highlights = splitPipeValues(getValue("highlights"));
      const imageUrls = splitPipeValues(getValue("imageUrls"));
      const specMap = {
        ...parseKeyValueList(getValue("specs")),
      };
      const attrMap = {
        ...parseKeyValueList(getValue("attributes")),
      };

      Object.entries(values).forEach(([rawHeader, rawCell]) => {
        const header = toAttributeKey(rawHeader);
        const value = String(rawCell || "").trim();
        if (!value) return;

        if (header.startsWith("spec_")) {
          specMap[header.slice(5)] = value;
          return;
        }

        if (header.startsWith("attr_")) {
          attrMap[header.slice(5)] = value;
          return;
        }

        if (["color", "ram", "storage"].includes(header)) {
          attrMap[header] = value;
        }
      });

      const issues = [];
      if (!name) issues.push("Missing product name");
      if (!slug) issues.push("Missing slug or name");
      if (!description) issues.push("Missing description");
      if (!sku) issues.push("Missing SKU");
      if (!Number.isFinite(priceValue)) issues.push("Invalid price");
      if (!Number.isFinite(stockValue)) issues.push("Invalid stock");
      if (!brandId && !brandLabel) issues.push("Missing brand");
      if (!categoryId && !categoryLabel) issues.push("Missing category");
      if (slug && existingSlugSet.has(slug.toLowerCase())) issues.push(`Slug already exists: ${slug}`);
      if (sku && existingSkuSet.has(sku.toLowerCase())) issues.push(`SKU already exists: ${sku}`);
      if (imageUrls.some((url) => !isLikelyUrl(url))) issues.push("One or more image URLs are invalid");
      if (!brandId && brandLabel && !allowMissingDependencies) {
        issues.push(`Unknown brand: ${brandLabel}`);
      }
      if (!categoryId && categoryLabel && !allowMissingDependencies) {
        issues.push(`Unknown category: ${categoryLabel}`);
      }

      return {
        rowNumber,
        name,
        slug,
        productKey: (slug || slugify(name || `row-${rowNumber}`)).toLowerCase(),
        brandLabel,
        brandId,
        categoryLabel,
        categoryId,
        description,
        publicationStatus:
          String(getValue("publicationStatus") || "draft").trim().toLowerCase() || "draft",
        isFeatured: parseBooleanCell(getValue("isFeatured"), false),
        warrantyMonths: Number(getValue("warrantyMonths") || 0),
        highlights,
        specs: specMap,
        basePrice: Number.isFinite(priceValue) ? priceValue : 0,
        variant: {
          sku,
          price: Number.isFinite(priceValue) ? priceValue : 0,
          countInStock: Number.isFinite(stockValue) ? stockValue : 0,
          lowStockThreshold: Number.isFinite(lowStockThreshold) ? lowStockThreshold : 5,
          isDefault: parseBooleanCell(getValue("defaultVariant"), false),
          imageUrls,
          attributes: attrMap,
        },
        issues,
      };
    });

    const skuSet = new Set();
    rowEntries.forEach((row) => {
      const skuKey = String(row.variant?.sku || "").trim().toLowerCase();
      if (!skuKey) return;
      if (skuSet.has(skuKey)) row.issues.push(`Duplicate CSV SKU: ${row.variant.sku}`);
      else skuSet.add(skuKey);
    });

    const grouped = new Map();
    rowEntries.forEach((row) => {
      if (!grouped.has(row.productKey)) grouped.set(row.productKey, []);
      grouped.get(row.productKey).push(row);
    });

    return Array.from(grouped.values())
      .map((rows) => {
        const first = rows[0];
        const issues = [...rows.flatMap((row) => row.issues)];

        const inconsistentField = (field, formatter = (value) => value) => {
          const values = Array.from(
            new Set(
              rows
                .map((row) => formatter(row[field]))
                .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
            )
          );
          return values.length > 1 ? values : null;
        };

        if (inconsistentField("name")) issues.push("Rows for this product use different names");
        if (inconsistentField("brandLabel")) issues.push("Rows for this product use different brands");
        if (inconsistentField("categoryLabel")) issues.push("Rows for this product use different categories");
        if (inconsistentField("description")) issues.push("Rows for this product use different descriptions");
        if (inconsistentField("publicationStatus")) issues.push("Rows for this product use different publication statuses");

        const attributeKeys = Array.from(
          new Set(rows.flatMap((row) => Object.keys(row.variant?.attributes || {})).filter(Boolean))
        );
        const defaultVariantCount = rows.filter((row) => row.variant?.isDefault).length;
        const variants = rows.map((row, index) => ({
          ...row.variant,
          isDefault: defaultVariantCount ? !!row.variant?.isDefault : index === 0,
        }));
        const imageCount = variants.reduce(
          (sum, variant) => sum + (Array.isArray(variant.imageUrls) ? variant.imageUrls.length : 0),
          0
        );

        const payload =
          issues.length === 0
            ? {
                rowNumber: first.rowNumber,
                name: first.name,
                slug: first.slug,
                brand: first.brandId,
                category: first.categoryId,
                description: first.description,
                basePrice:
                  rows.reduce((min, row) => Math.min(min, Number(row.basePrice || 0)), Number.POSITIVE_INFINITY) ||
                  0,
                warrantyMonths: Number(first.warrantyMonths || 0),
                highlights: first.highlights,
                specs: rows.reduce((acc, row) => ({ ...acc, ...(row.specs || {}) }), {}),
                isFeatured: !!first.isFeatured,
                publicationStatus: first.publicationStatus,
                variants,
              }
            : null;

        return {
          rowNumber: first.rowNumber,
          rowNumbers: rows.map((row) => row.rowNumber),
          name: first.name || `Product ${first.rowNumber}`,
          slug: first.slug,
          sku: rows.map((row) => row.variant?.sku).filter(Boolean).join(", "),
          skuCount: variants.length,
          imageCount,
          status: first.publicationStatus || "draft",
          issues: Array.from(new Set(issues)),
          missingBrandName: !first.brandId ? first.brandLabel : "",
          missingCategoryName: !first.categoryId ? first.categoryLabel : "",
          attributeKeys,
          payload,
        };
      })
      .sort((a, b) => a.rowNumber - b.rowNumber);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (!bulkImportSourceText) return;
    setBulkImportRows(buildBulkImportPreviewRows(bulkImportSourceText));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkImportSourceText, autoCreateImportDependencies, brands, categories, products]);

  const downloadBulkImportTemplate = () => {
    const blob = new Blob([BULK_IMPORT_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "product-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const previewRows = buildBulkImportPreviewRows(text);
      setBulkImportFileName(file.name);
      setBulkImportSourceText(text);
      setBulkImportRows(previewRows);
      setBulkImportFeedback(null);
    } catch (error) {
      console.error(error);
      alert("Failed to read CSV file.");
    } finally {
      event.target.value = "";
    }
  };

  const ensureBulkImportDependencies = async () => {
    const missingBrands = Array.from(
      new Set(
        bulkImportRows
          .map((row) => row.missingBrandName)
          .filter(Boolean)
          .map((value) => String(value).trim())
      )
    );
    const missingCategories = Array.from(
      new Set(
        bulkImportRows
          .map((row) => row.missingCategoryName)
          .filter(Boolean)
          .map((value) => String(value).trim())
      )
    );

    const createdBrands = [];
    const createdCategories = [];

    for (const brandName of missingBrands) {
      try {
        const { data } = await api.post("/brands", {
          name: brandName,
          slug: slugify(brandName),
        });
        createdBrands.push(data);
      } catch (error) {
        if (error?.response?.status !== 409) throw error;
      }
    }

    for (const categoryName of missingCategories) {
      const matchingRows = bulkImportRows.filter((row) => row.missingCategoryName === categoryName);
      const attributes = Array.from(
        new Set(matchingRows.flatMap((row) => row.attributeKeys || []).filter(Boolean))
      );
      const highlightsTemplate = matchingRows.find((row) => row.payload?.highlights?.length)?.payload?.highlights || [];
      const specsTemplate = matchingRows.find((row) => row.payload)?.payload?.specs || {};

      try {
        const { data } = await api.post("/categories", {
          name: categoryName,
          slug: slugify(categoryName),
          attributes,
          highlightsTemplate,
          specsTemplate,
        });
        createdCategories.push(data);
      } catch (error) {
        if (error?.response?.status !== 409) throw error;
      }
    }

    if (!missingBrands.length && !missingCategories.length) {
      return { brandsList: brands, categoriesList: categories };
    }

    const brandsList = [...brands, ...createdBrands];
    const categoriesList = [...categories, ...createdCategories];

    const [freshBrandsRes, freshCategoriesRes] = await Promise.all([
      api.get("/brands"),
      api.get("/categories"),
    ]);

    const nextBrands = Array.isArray(freshBrandsRes.data) ? freshBrandsRes.data : brandsList;
    const nextCategories = Array.isArray(freshCategoriesRes.data) ? freshCategoriesRes.data : categoriesList;
    setBrands(nextBrands);
    setCategories(nextCategories);

    return {
      brandsList: nextBrands,
      categoriesList: nextCategories,
    };
  };

  const submitBulkImport = async () => {
    if (!bulkImportRows.length) {
      alert("Upload a CSV file first.");
      return;
    }

    try {
      setImportingProducts(true);

      let previewRows = bulkImportRows;
      let dependencyLists = { brandsList: brands, categoriesList: categories };

      if (autoCreateImportDependencies) {
        dependencyLists = await ensureBulkImportDependencies();
        previewRows = buildBulkImportPreviewRows(bulkImportSourceText, {
          ...dependencyLists,
          allowMissingDependencies: true,
        });
        setBulkImportRows(previewRows);
      }

      const validRows = previewRows.filter((row) => row.payload && row.issues.length === 0);
      if (!validRows.length) {
        alert("No valid products are ready to import.");
        return;
      }

      const { data } = await api.post("/products/bulk-import", {
        products: validRows.map((row) => row.payload),
      });

      setBulkImportFeedback({
        createdCount: Number(data?.createdCount || 0),
        failedCount: Number(data?.failedCount || 0),
        created: Array.isArray(data?.created) ? data.created : [],
        errors: Array.isArray(data?.errors) ? data.errors : [],
      });
      await fetchAll();
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Failed to bulk import products.");
    } finally {
      setImportingProducts(false);
    }
  };

  const buildSnapshotFromProduct = (product) => {
    const nextFormData = {
      name: product?.name || "",
      slug: product?.slug || "",
      brand: product?.brand?._id || product?.brand || "",
      category: product?.category?._id || product?.category || "",
      description: product?.description || "",
      highlightsText: highlightsArrayToText(product?.highlights),
      specsText: specsObjectToText(product?.specs),
      basePrice: product?.basePrice ?? "",
      warrantyMonths: product?.warrantyMonths ?? "",
      isFeatured: !!product?.isFeatured,
      publicationStatus: getPublicationStatus(product),
    };

    const mappedVariants = (product?.variants || []).map((variant) => ({
      _id: variant._id,
      sku: variant.sku || "",
      price: variant.price ?? "",
      countInStock: variant.countInStock ?? "",
      lowStockThreshold: variant.lowStockThreshold ?? 5,
      isDefault: !!variant.isDefault,
      attributes: { ...(variant.attributes || {}) },
      images: Array.isArray(variant.images) ? variant.images : [],
    }));

    if (mappedVariants.length) {
      const defaults = mappedVariants.filter((variant) => variant.isDefault).length;
      if (defaults === 0) mappedVariants[0].isDefault = true;
      if (defaults > 1) {
        let first = true;
        for (const variant of mappedVariants) {
          if (variant.isDefault && first) first = false;
          else if (variant.isDefault && !first) variant.isDefault = false;
        }
      }
    }

    return {
      formData: nextFormData,
      variants: mappedVariants.length ? mappedVariants : [emptyVariant(true)],
    };
  };

  useEffect(() => {
    if (!isEditorPage) {
      hasHydratedEditorRef.current = false;
      setIsDirty(false);
      return;
    }

    if (isCreatePage) {
      if (hasHydratedEditorRef.current) return;
      const savedDraft = localStorage.getItem(PRODUCT_CREATE_DRAFT_KEY);
      if (savedDraft) {
        try {
          const parsedDraft = JSON.parse(savedDraft);
          applySnapshotToForm(parsedDraft);
          markCurrentStateAsClean(JSON.stringify(parsedDraft));
        } catch (error) {
          console.error("Failed to restore product draft", error);
          resetForm();
          localStorage.removeItem(PRODUCT_CREATE_DRAFT_KEY);
        }
      } else {
        const emptySnapshot = createEmptyProductSnapshot();
        applySnapshotToForm(emptySnapshot);
        markCurrentStateAsClean(JSON.stringify(emptySnapshot));
      }
      hasHydratedEditorRef.current = true;
      return;
    }

    if (isEditPage && productId && products.length > 0) {
      const product = products.find((item) => String(item._id) === String(productId));
      if (!product) return;
      const snapshot = buildSnapshotFromProduct(product);
      setEditingId(product._id);
      applySnapshotToForm(snapshot);
      markCurrentStateAsClean(JSON.stringify(snapshot));
      hasHydratedEditorRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditorPage, isCreatePage, isEditPage, productId, products]);

  useEffect(() => {
    const nextSnapshot = JSON.stringify({ formData, variants });
    setIsDirty(isEditorPage && hasHydratedEditorRef.current && nextSnapshot !== formSnapshotRef.current);
  }, [formData, variants, isEditorPage]);

  useEffect(() => {
    if (!isCreatePage || !hasHydratedEditorRef.current) return;
    const snapshot = JSON.stringify({ formData, variants });
    localStorage.setItem(PRODUCT_CREATE_DRAFT_KEY, snapshot);
  }, [formData, variants, isCreatePage]);

  useEffect(() => {
    if (!isEditorPage) return undefined;

    const handleBeforeUnload = (event) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, isEditorPage]);

  // auto slug while creating product
  useEffect(() => {
    if (!editingId) {
      setFormData((prev) => ({
        ...prev,
        slug: prev.slug ? prev.slug : slugify(prev.name),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.name]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c._id === formData.category) || null,
    [categories, formData.category]
  );

  const applyCategoryInfoPreset = (force = false) => {
    const preset = getPresetInfoTemplate(selectedCategory);
    if (!preset) return;

    setFormData((prev) => {
      const hasHighlights = String(prev.highlightsText || "").trim().length > 0;
      const hasSpecs = String(prev.specsText || "").trim().length > 0;

      if (!force && (hasHighlights || hasSpecs)) return prev;

      return {
        ...prev,
        highlightsText: highlightsArrayToText(preset.highlights),
        specsText: specsObjectToText(preset.specs),
      };
    });
  };

  useEffect(() => {
    if (editingId || !selectedCategory) return;
    applyCategoryInfoPreset(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, selectedCategory?._id]);

  const saveCategoryTemplateFromForm = async () => {
    if (!selectedCategory?._id) {
      alert("Select a category first.");
      return;
    }

    try {
      setSavingCategoryTemplate(true);
      await api.put(`/categories/${selectedCategory._id}`, {
        highlightsTemplate: parseHighlightsText(formData.highlightsText),
        specsTemplate: parseSpecsText(formData.specsText),
      });
      await fetchAll();
      alert("Category template saved.");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to save category template.");
    } finally {
      setSavingCategoryTemplate(false);
    }
  };

  const variantAttributeKeys = useMemo(() => {
    const dbKeys = Array.isArray(selectedCategory?.attributes)
      ? selectedCategory.attributes.map(toAttributeKey).filter(Boolean)
      : [];
    if (dbKeys.length) return Array.from(new Set(dbKeys));

    const presetKeys = getPresetAttributeKeys(selectedCategory);
    if (presetKeys.length) return Array.from(new Set(presetKeys));

    return DEFAULT_VARIANT_ATTRIBUTE_KEYS;
  }, [selectedCategory]);

  const mergeAttrsFromSpecs = (attrs, specs) => {
    const specEntries = Object.entries(specs || {});
    if (!specEntries.length) return { attrs, changed: false };

    const nextAttrs = { ...(attrs || {}) };
    let changed = false;

    for (const [rawKey, rawValue] of specEntries) {
      const key = toAttributeKey(rawKey);
      if (!key) continue;
      if (variantAttributeKeys.length && !variantAttributeKeys.includes(key)) continue;
      const existing = String(nextAttrs[key] || "").trim();
      if (existing) continue;
      const value = String(rawValue || "").trim();
      if (!value) continue;
      nextAttrs[key] = value;
      changed = true;
    }

    return { attrs: nextAttrs, changed };
  };

  const applySpecsToDefaultVariant = (rawSpecsText) => {
    const specs = parseSpecsText(rawSpecsText);
    if (!Object.keys(specs).length) return;

    setVariants((prev) => {
      const idx = prev.findIndex((v) => v.isDefault);
      if (idx < 0) return prev;

      const current = prev[idx];
      const merged = mergeAttrsFromSpecs(current.attributes, specs);
      if (!merged.changed) return prev;
      const next = [...prev];
      next[idx] = { ...current, attributes: merged.attrs };
      return next;
    });
  };

  useEffect(() => {
    if (!variantAttributeKeys.length) return;
    setVariants((prev) => {
      let changed = false;
      const next = prev.map((v) => {
        const attrs = { ...(v.attributes || {}) };
        let localChange = false;
        for (const key of variantAttributeKeys) {
          if (attrs[key] === undefined) {
            attrs[key] = "";
            localChange = true;
          }
        }
        if (!localChange) return v;
        changed = true;
        return { ...v, attributes: attrs };
      });
      return changed ? next : prev;
    });
  }, [variantAttributeKeys]);

  useEffect(() => {
    applySpecsToDefaultVariant(formData.specsText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.specsText, variantAttributeKeys]);

  const filteredProducts = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products.filter((p) => {
      const matchesText =
        !term ||
        p?.name?.toLowerCase().includes(term) ||
        p?.slug?.toLowerCase().includes(term) ||
        p?.brand?.name?.toLowerCase?.().includes(term) ||
        p?.category?.name?.toLowerCase?.().includes(term);

      const matchesBrand =
        !filterBrand || (p?.brand?._id || p?.brand) === filterBrand;

      const matchesCategory =
        !filterCategory || (p?.category?._id || p?.category) === filterCategory;

      const publicationStatus = getPublicationStatus(p);
      const matchesFeatured = !onlyFeatured || !!p.isFeatured;
      const matchesActive = !onlyActive || publicationStatus === "published";
      const matchesStatus = !filterStatus || publicationStatus === filterStatus;

      return (
        matchesText &&
        matchesBrand &&
        matchesCategory &&
        matchesFeatured &&
        matchesStatus &&
        matchesActive
      );
    });
  }, [products, q, filterBrand, filterCategory, filterStatus, onlyFeatured, onlyActive]);

  const bulkImportSummary = useMemo(() => {
    const totalRows = bulkImportRows.length;
    const validRows = bulkImportRows.filter((row) => row.payload && row.issues.length === 0).length;
    const invalidRows = totalRows - validRows;
    return { totalRows, validRows, invalidRows };
  }, [bulkImportRows]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const focusByOffset = (container, fromEl, offset) => {
    const fields = getKeyboardNavigableFields(container);
    const idx = fields.indexOf(fromEl);
    if (idx < 0) return;
    const nextIdx = idx + offset;
    if (nextIdx < 0 || nextIdx >= fields.length) return;
    fields[nextIdx].focus();
  };

  const handleFormKeyboardNav = (e) => {
    const target = e.target;
    if (!target || !["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(target.tagName)) {
      return;
    }

    const formEl = e.currentTarget;
    const isTextarea = target.tagName === "TEXTAREA";
    const isButton = target.tagName === "BUTTON";

    // Enter moves to next field (Shift+Enter previous). Keep textarea line-break behavior.
    if (e.key === "Enter" && !isTextarea && !isButton) {
      e.preventDefault();
      focusByOffset(formEl, target, e.shiftKey ? -1 : 1);
      return;
    }

    // Alt + Arrow keys navigate between form controls.
    if (e.altKey && ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
      focusByOffset(formEl, target, forward ? 1 : -1);
    }
  };

  const handleVariantChange = (idx, field, value) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v))
    );
  };

  const handleVariantAttr = (idx, key, value) => {
    setVariants((prev) =>
      prev.map((v, i) =>
        i === idx ? { ...v, attributes: { ...v.attributes, [key]: value } } : v
      )
    );
  };

  const copyFromDefaultVariant = (variant) => ({
    ...emptyVariant(false),
    price: variant?.price ?? "",
    countInStock: variant?.countInStock ?? "",
    lowStockThreshold: variant?.lowStockThreshold ?? 5,
    attributes: { ...(variant?.attributes || {}) },
  });

  const addVariant = () => {
    setVariants((prev) => {
      const defaultVariant = prev.find((v) => v.isDefault) || prev[0];
      const next = defaultVariant ? copyFromDefaultVariant(defaultVariant) : emptyVariant(false);
      return [...prev, next];
    });
  };

  // ✅ fixed: remove variant + reindex variantFiles
  const removeVariant = (idx) => {
    setVariants((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // Ensure exactly one default after remove
      const hasDefault = next.some((x) => x.isDefault);
      if (!hasDefault && next.length) next[0] = { ...next[0], isDefault: true };
      return next;
    });

    setVariantFiles((prev) => {
      const next = {};
      Object.entries(prev).forEach(([k, files]) => {
        const i = Number(k);
        if (i === idx) return;
        next[i > idx ? i - 1 : i] = files;
      });
      return next;
    });
  };

  // ✅ enforce single default instantly
  const setDefaultVariant = (idx) => {
    const specs = parseSpecsText(formData.specsText);
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== idx) return { ...v, isDefault: false };
        const merged = mergeAttrsFromSpecs(v.attributes, specs);
        return {
          ...v,
          isDefault: true,
          attributes: merged.changed ? merged.attrs : v.attributes,
        };
      })
    );
  };

  // ✅ upload helper (single upload endpoint, loops files)
  const uploadImagesToVariant = async (productId, variantId, files = []) => {
    for (const file of files) {
      const fd = new FormData();
      fd.append("image", file);

      await api.post(`/products/${productId}/images?variantId=${variantId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
  };

  const openEdit = (p) => {
    hasHydratedEditorRef.current = false;
    navigate(`/admin/products/${p._id}/edit`);
  };

  const duplicateProduct = async (product) => {
    const ok = window.confirm(
      `Create a draft copy of "${product?.name || "this product"}" with fresh SKUs?`
    );
    if (!ok) return;

    try {
      const { data } = await api.post(`/products/${product._id}/duplicate`);
      await fetchAll();
      hasHydratedEditorRef.current = false;
      navigate(`/admin/products/${data?._id}/edit`);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to duplicate product.");
    }
  };

  const leaveEditor = ({ discardDraft = false } = {}) => {
    if (isDirty) {
      const ok = window.confirm("You have unsaved product changes. Leave this page?");
      if (!ok) return;
    }

    if (discardDraft && !editingId) {
      localStorage.removeItem(PRODUCT_CREATE_DRAFT_KEY);
    }

    hasHydratedEditorRef.current = false;
    resetForm();
    navigate("/admin/products");
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product from the storefront? It will stay in the database for order history and revenue analytics.")) return;
    try {
      await api.delete(`/products/${id}`);
      await fetchAll();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to delete product.");
    }
  };

  const deleteVariantImage = async (productId, variantId, public_id) => {
    if (!window.confirm("Delete this image?")) return;
    try {
      await api.delete(`/products/${productId}/images`, {
        data: { variantId, public_id },
      });

      setVariants((prev) =>
        prev.map((v) =>
          v._id === variantId
            ? { ...v, images: v.images.filter((img) => img.public_id !== public_id) }
            : v
        )
      );
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to delete image.");
    }
  };

  const findVariantIdBySku = (prod, sku) => {
    const s = String(sku || "").trim();
    const v = (prod?.variants || []).find((x) => String(x?.sku || "").trim() === s);
    return v?._id || null;
  };

  const validateBeforeSave = () => {
    // If you selected files for a variant, SKU must exist
    for (const [idxStr, files] of Object.entries(variantFiles)) {
      const idx = Number(idxStr);
      if (!files?.length) continue;
      const sku = String(variants?.[idx]?.sku || "").trim();
      if (!sku) {
        alert(`Variant #${idx + 1}: SKU is required because you selected images for it.`);
        return false;
      }
    }

    // Prevent duplicate SKUs (important for mapping on create)
    const skus = variants
      .map((v) => String(v.sku || "").trim())
      .filter(Boolean);

    const set = new Set();
    for (const s of skus) {
      const key = s.toLowerCase();
      if (set.has(key)) {
        alert(`Duplicate SKU found: "${s}". Please make SKUs unique.`);
        return false;
      }
      set.add(key);
    }

    return true;
  };

  const saveProduct = async (e, statusOverride = null) => {
    e?.preventDefault?.();

    if (brands.length === 0 || categories.length === 0) {
      alert("Please create at least one Brand and one Category first.");
      return;
    }

    if (
      !formData.name ||
      !formData.slug ||
      !formData.brand ||
      !formData.category ||
      !formData.description
    ) {
      alert("Please fill: name, slug, brand, category, description.");
      return;
    }

    if (!validateBeforeSave()) return;

    const cleanedVariants = variants.map((v) => {
      const normalized = {
        sku: String(v.sku || "").trim(),
        price: Number(v.price || 0),
        countInStock: Number(v.countInStock || 0),
        lowStockThreshold: Math.max(0, Number(v.lowStockThreshold || 5)),
        isDefault: !!v.isDefault,
        attributes: Object.entries(v.attributes || {}).reduce((acc, [rawKey, rawVal]) => {
          const key = toAttributeKey(rawKey);
          if (!key) return acc;
          const value = String(rawVal || "").trim();
          if (value) acc[key] = value;
          return acc;
        }, {}),
      };

      // Keep existing variant identity and gallery when editing.
      if (v?._id) normalized._id = v._id;
      if (Array.isArray(v?.images)) normalized.images = v.images;

      return normalized;
    });

    // Ensure exactly one default
    if (cleanedVariants.length > 0) {
      let defaultCount = cleanedVariants.filter((x) => x.isDefault).length;
      if (defaultCount === 0) cleanedVariants[0].isDefault = true;
      if (defaultCount > 1) {
        let first = true;
        for (const v of cleanedVariants) {
          if (v.isDefault && first) first = false;
          else if (v.isDefault && !first) v.isDefault = false;
        }
      }
    }

    const nextPublicationStatus = statusOverride || formData.publicationStatus || "draft";

    const payload = {
      name: formData.name.trim(),
      slug: slugify(formData.slug),
      brand: formData.brand,
      category: formData.category,
      description: formData.description,
      highlights: parseHighlightsText(formData.highlightsText),
      specs: parseSpecsText(formData.specsText),
      basePrice: Number(formData.basePrice || 0),
      warrantyMonths: Number(formData.warrantyMonths || 0),
      publicationStatus: nextPublicationStatus,
      isFeatured: !!formData.isFeatured,
      isActive: nextPublicationStatus === "published",
      variants: cleanedVariants,
    };

    try {
      setSaving(true);

      let productId = editingId;

      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        const { data } = await api.post("/products", payload);
        productId = data?._id;
      }

      // ✅ Upload images for EACH variant after save
      const hasAnyUploads = Object.values(variantFiles).some(
        (arr) => (arr?.length || 0) > 0
      );

      if (hasAnyUploads) {
        // Always refetch product after save (important!)
        const fresh = await api.get(`/products/id/${productId}`);
        const prod = fresh.data;

        for (const [idxStr, files] of Object.entries(variantFiles)) {
          const idx = Number(idxStr);
          if (!files || files.length === 0) continue;

          // Always map using SKU
          const sku = cleanedVariants?.[idx]?.sku;
          if (!sku) continue;

          const variantId = findVariantIdBySku(prod, sku);

          if (!variantId) {
            console.warn("Variant not found for upload:", { idx, sku });
            continue;
          }

          await uploadImagesToVariant(productId, variantId, files);
        }
      }


      await fetchAll();
      if (!editingId) {
        localStorage.removeItem(PRODUCT_CREATE_DRAFT_KEY);
      }
      resetForm();
      navigate("/admin/products");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  };

  // ---- QUICK ADD (brand/category) ----
  const openQuickAdd = (type) => {
    setCreateType(type);
    setCreateErr("");
    setCreateName("");
    setCreateSlug("");
    setCreateAttributes("");
  };

  useEffect(() => {
    if (!createType) return;
    setCreateSlug(slugify(createName));
  }, [createName, createType]);

  const submitQuickAdd = async () => {
    try {
      setCreating(true);
      setCreateErr("");

      const name = createName.trim();
      const slug = slugify(createSlug || createName);

      if (!name) {
        setCreateErr("Name is required.");
        return;
      }

      if (createType === "brand") {
        const { data } = await api.post("/brands", { name, slug });
        await fetchAll();
        setFormData((p) => ({ ...p, brand: data?._id || p.brand }));
      } else {
        const manualAttributes = Array.from(
          new Set(
            String(createAttributes || "")
              .split(",")
              .map((x) => toAttributeKey(x))
              .filter(Boolean)
          )
        );
        const attributes = manualAttributes.length
          ? manualAttributes
          : getPresetAttributeKeys({ name, slug });
        const infoTemplate = getPresetInfoTemplate({ name, slug });
        const { data } = await api.post("/categories", {
          name,
          slug,
          attributes,
          highlightsTemplate: infoTemplate?.highlights || [],
          specsTemplate: infoTemplate?.specs || {},
        });
        await fetchAll();
        setFormData((p) => ({ ...p, category: data?._id || p.category }));
      }

      setCreateType(null);
    } catch (e) {
      console.error(e);
      setCreateErr(
        e?.response?.data?.message || "Failed to create. Check backend POST route."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleQuickAddSubmit = (e) => {
    e.preventDefault();
    if (creating) return;
    submitQuickAdd();
  };

  const priceFromProduct = (p) => p?.basePrice ?? p?.variants?.[0]?.price ?? 0;
  const stockFromProduct = (p) =>
    Number(
      p?.inventorySummary?.available ??
        p?.variants?.reduce((sum, v) => sum + Number((v.availableStock ?? v.countInStock) || 0), 0) ??
        0
    );
  const imageFromProduct = (p) => p?.variants?.[0]?.images?.[0]?.url || fallbackImg;
  const saveProductWithStatus = (status) => saveProduct(null, status);

  return (
    <div className="space-y-6">
      {!isEditorPage ? (
        <>
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Products</h1>
              <p className="text-sm text-gray-500">
                Create products one by one, duplicate similar products, and manage draft versus published items.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openImportModal}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Upload size={18} /> Bulk Import CSV
              </button>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
              >
                <Plus size={18} /> Add Product
              </button>
            </div>
          </div>

          {/* Helpful warning if missing base data */}
          {(brands.length === 0 || categories.length === 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm">
              <div className="font-extrabold text-amber-900">Setup required</div>
              <div className="text-amber-800 mt-1">
                You must create at least <span className="font-semibold">1 Brand</span> and{" "}
                <span className="font-semibold">1 Category</span> before adding products.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {brands.length === 0 && (
                  <button
                    onClick={() => {
                      openCreate();
                      openQuickAdd("brand");
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 text-white px-3 py-2 text-xs font-semibold hover:bg-amber-500"
                  >
                    <Tag size={14} /> Create Brand
                  </button>
                )}
                {categories.length === 0 && (
                  <button
                    onClick={() => {
                      openCreate();
                      openQuickAdd("category");
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 text-white px-3 py-2 text-xs font-semibold hover:bg-amber-500"
                  >
                    <Shapes size={14} /> Create Category
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="premium-card rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
          <div className="md:col-span-2 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={16} />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, slug, brand, category…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 pl-9 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none"
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none"
          >
            <option value="">All statuses</option>
            {PRODUCT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-3 justify-between md:justify-end">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={onlyFeatured}
                onChange={(e) => setOnlyFeatured(e.target.checked)}
              />
              Featured
            </label>

            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
              />
              Published only
            </label>
          </div>
        </div>
          </div>

          {/* Table */}
          <div className="premium-card rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredProducts.length}</span> of{" "}
            <span className="font-semibold">{products.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Product</th>
                <th className="text-left px-4 py-3 font-semibold">Brand</th>
                <th className="text-left px-4 py-3 font-semibold">Category</th>
                <th className="text-left px-4 py-3 font-semibold">Price</th>
                <th className="text-left px-4 py-3 font-semibold">Available</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={7}>
                    Loading…
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={7}>
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const img = imageFromProduct(p);
                  const price = priceFromProduct(p);
                  const stock = stockFromProduct(p);
                  const publicationStatus = getPublicationStatus(p);

                  return (
                    <tr key={p._id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 min-w-[260px]">
                          <img
                            src={img}
                            alt={p.name}
                            className="h-10 w-10 rounded-lg object-cover border"
                            onError={(e) => (e.currentTarget.src = fallbackImg)}
                          />
                          <div>
                            <div className="font-semibold text-gray-900 line-clamp-1">
                              {p.name}
                            </div>
                            <div className="text-xs text-gray-500">{p.slug}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700">{p.brand?.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{p.category?.name || "—"}</td>

                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {moneyBDT(price)}
                      </td>

                      <td className="px-4 py-3">
                          <span
                            className={`font-semibold ${stock <= 5 ? "text-red-600" : "text-gray-900"
                              }`}
                          >
                            {stock}
                          </span>
                          <div className="text-[11px] text-gray-500">
                            On hand {p?.inventorySummary?.onHand ?? stock} / Reserved {p?.inventorySummary?.reserved ?? 0}
                          </div>
                        </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadgeClassName(
                              publicationStatus
                            )}`}
                          >
                            {publicationStatus === "published"
                              ? "Published"
                              : publicationStatus === "archived"
                              ? "Archived"
                              : "Draft"}
                          </span>

                          {p.isDeleted && (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-50 text-red-700">
                              Deleted
                            </span>
                          )}

                          {p.isFeatured && (
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                              Featured
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="p-2 rounded-lg border hover:bg-gray-50"
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => duplicateProduct(p)}
                            className="p-2 rounded-lg border hover:bg-gray-50"
                            title="Duplicate"
                          >
                            <Copy size={16} />
                          </button>

                          <button
                            onClick={() => deleteProduct(p._id)}
                            className="p-2 rounded-lg border hover:bg-red-50 text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
          </div>
        </>
      ) : (
        <div className="mx-auto w-full max-w-6xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <button
                type="button"
                onClick={() => leaveEditor()}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft size={16} />
                Back to Products
              </button>
              <h1 className="mt-3 text-2xl font-extrabold text-gray-900">
                {editingId ? "Edit Product" : "Add Product"}
              </h1>
              <p className="text-sm text-gray-500">
                Manage base info, variants, images, inventory, and whether this product is still a draft or ready for the storefront.
              </p>
            </div>

            <div className="rounded-2xl border bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
              {isDirty
                ? "Unsaved changes are being protected."
                : editingId
                ? "Editing existing product"
                : "New products start as drafts unless you publish them."}
            </div>
          </div>

          <div className="premium-card overflow-hidden rounded-[1.75rem]">
            <div className="border-b p-5 flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-extrabold text-gray-900">
                  {editingId ? "Edit Product" : "Add Product"}
                </div>
                <div className="text-sm text-gray-500">
                  {editingId
                    ? "Changes here update the live product record."
                    : "New products stay in your local draft until you save or publish them."}
                </div>
              </div>

              <button
                type="button"
                onClick={() => leaveEditor()}
                className="p-2 rounded-xl hover:bg-gray-100"
                aria-label="Back to products"
              >
                <ArrowLeft size={18} />
              </button>
            </div>

            <form
              onSubmit={saveProduct}
              onKeyDown={handleFormKeyboardNav}
              className="p-5 space-y-6"
            >
              {/* toggles */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    name="isFeatured"
                    checked={formData.isFeatured}
                    onChange={handleChange}
                  />
                  Featured
                </label>

                <div className="min-w-[220px]">
                  <label className="text-xs font-semibold text-gray-600">Product status</label>
                  <select
                    name="publicationStatus"
                    value={formData.publicationStatus}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none"
                  >
                    {PRODUCT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* base fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600">Name</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={(e) => {
                      handleChange(e);
                      if (!editingId) {
                        setFormData((prev) => ({ ...prev, slug: slugify(e.target.value) }));
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600">Slug</label>
                  <input
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                    required
                  />
                </div>

                {/* Brand row with Quick Add */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-600">Brand</label>
                    <button
                      type="button"
                      onClick={() => openQuickAdd("brand")}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      + Create
                    </button>
                  </div>
                  <select
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none"
                    required
                  >
                    <option value="">{brands.length ? "Select brand" : "No brands yet"}</option>
                    {brands.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category row with Quick Add */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-600">Category</label>
                    <button
                      type="button"
                      onClick={() => openQuickAdd("category")}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      + Create
                    </button>
                  </div>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white outline-none"
                    required
                  >
                    <option value="">
                      {categories.length ? "Select category" : "No categories yet"}
                    </option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600">Base Price (৳)</label>
                  <input
                    name="basePrice"
                    type="number"
                    value={formData.basePrice}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <div className="mt-1 text-[11px] text-gray-500">
                    Auto-set from the lowest variant price when variants are provided.
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600">Warranty (months)</label>
                  <input
                    name="warrantyMonths"
                    type="number"
                    value={formData.warrantyMonths}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 min-h-[110px]"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-600">
                      Highlights (one per line)
                    </label>
                    <div className="flex items-center gap-3">
                      {getPresetInfoTemplate(selectedCategory) && (
                        <button
                          type="button"
                          onClick={() => applyCategoryInfoPreset(true)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          Use Category Preset
                        </button>
                      )}
                      {selectedCategory?._id && (
                        <button
                          type="button"
                          onClick={saveCategoryTemplateFromForm}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-60"
                          disabled={savingCategoryTemplate}
                        >
                          {savingCategoryTemplate ? "Saving..." : "Save As Category Template"}
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    name="highlightsText"
                    value={formData.highlightsText}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 min-h-[100px]"
                    placeholder={"Fast chipset\n120Hz smooth display\nAll-day battery life"}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600">
                    Specs (format: key: value)
                  </label>
                  <textarea
                    name="specsText"
                    value={formData.specsText}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 min-h-[120px]"
                    placeholder={"display: 6.7 inch AMOLED\nchipset: Snapdragon 8 Gen 3\nbattery: 5000 mAh"}
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    Example keys: display, chipset, battery, connectivity, gpu.
                  </div>
                </div>
              </div>

              {/* Variants */}
              <div className="premium-card rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-gray-900">Variants</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Fields: {variantAttributeKeys.map(formatAttributeLabel).join(", ")}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">
                      Keyboard: Enter next, Shift+Enter previous, Alt+Arrow navigate.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-3 py-2 text-xs font-semibold hover:bg-indigo-500"
                  >
                    <Plus size={14} /> Add Variant
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {variants.map((v, idx) => (
                    <div key={v._id || idx} className="premium-card rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-semibold text-gray-900">
                          Variant #{idx + 1}{" "}
                          {v.isDefault && (
                            <span className="ml-2 text-xs rounded-full bg-indigo-600 text-white px-2 py-1">
                              Default
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDefaultVariant(idx)}
                            className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                          >
                            Set Default
                          </button>

                          {variants.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeVariant(idx)}
                              className="rounded-xl border px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-600">SKU</label>
                          <input
                            value={v.sku}
                            onChange={(e) => handleVariantChange(idx, "sku", e.target.value)}
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="IP15PM-256-BLK"
                          />
                          <div className="mt-1 text-[11px] text-gray-500">
                            SKU must be unique (used to map images on create).
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600">Price</label>
                          <input
                            type="number"
                            value={v.price}
                            onChange={(e) => handleVariantChange(idx, "price", e.target.value)}
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600">Stock</label>
                          <input
                            type="number"
                            value={v.countInStock}
                            onChange={(e) =>
                              handleVariantChange(idx, "countInStock", e.target.value)
                            }
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-600">Low-stock threshold</label>
                          <input
                            type="number"
                            min="0"
                            value={v.lowStockThreshold}
                            onChange={(e) =>
                              handleVariantChange(idx, "lowStockThreshold", e.target.value)
                            }
                            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        {variantAttributeKeys.map((attrKey) => (
                          <div key={`${v._id || idx}-${attrKey}`}>
                            <label className="text-xs font-semibold text-gray-600">
                              {formatAttributeLabel(attrKey)}
                            </label>
                            <input
                              value={v.attributes?.[attrKey] || ""}
                              onChange={(e) => handleVariantAttr(idx, attrKey, e.target.value)}
                              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                              placeholder={`Enter ${formatAttributeLabel(attrKey)}`}
                            />
                          </div>
                        ))}
                      </div>

                      {/* existing images (edit mode) */}
                      {editingId && Array.isArray(v.images) && v.images.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs font-semibold text-gray-600 mb-2">
                            Variant Images
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {v.images.map((img) => (
                              <div key={img.public_id} className="relative group">
                                <img
                                  src={img.url || fallbackImg}
                                  alt="variant"
                                  className="h-20 w-20 object-cover rounded-xl border"
                                  onError={(e) => (e.currentTarget.src = fallbackImg)}
                                />
                                <button
                                  type="button"
                                  onClick={() => deleteVariantImage(editingId, v._id, img.public_id)}
                                  className="absolute top-1 right-1 rounded-full bg-red-600 text-white p-1 opacity-0 group-hover:opacity-100"
                                  title="Delete image"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload images per variant */}
              <div className="premium-card rounded-2xl p-4">
                <div className="flex items-center gap-2 font-extrabold text-gray-900">
                  <ImageIcon size={18} /> Upload Variant Images
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Upload images for each variant separately. Upload happens on Save.
                </p>

                <div className="mt-4 space-y-3">
                  {variants.map((v, idx) => (
                    <div key={v._id || idx} className="premium-card rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-extrabold text-gray-900">
                            Variant #{idx + 1} {v.isDefault ? "(Default)" : ""}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            SKU: <span className="font-semibold">{v.sku || "—"}</span>
                          </div>
                        </div>

                        <div className="text-xs text-gray-600 font-semibold">
                          Selected: {variantFiles?.[idx]?.length || 0}
                        </div>
                      </div>

                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleVariantFiles(idx, e.target.files)}
                        className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-2 pb-6">
                <button
                  type="button"
                  onClick={() => {
                    if (!saving) {
                      if (editingId) leaveEditor();
                      else leaveEditor({ discardDraft: true });
                    }
                  }}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                  disabled={saving}
                >
                  {editingId ? "Cancel" : "Discard Draft"}
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60"
                  disabled={saving}
                >
                  <Check size={18} />
                  {saving
                    ? "Saving..."
                    : formData.publicationStatus === "published"
                    ? editingId
                      ? "Update Published Product"
                      : "Publish Product"
                    : editingId
                    ? "Save Product"
                    : "Create Product"}
                </button>

                <button
                  type="button"
                  onClick={() => saveProductWithStatus("draft")}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  disabled={saving}
                >
                  {editingId ? "Save as Draft" : "Create Draft"}
                </button>

                <button
                  type="button"
                  onClick={() => saveProductWithStatus("published")}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                  disabled={saving}
                >
                  {editingId ? "Save & Publish" : "Publish Now"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Modal
        open={isImportModalOpen}
        title="Bulk Import Products"
        subtitle="Upload a CSV to create many products at once. Repeated rows with the same slug are grouped into one product with multiple variants."
        onClose={closeImportModal}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">CSV columns</div>
            <div className="mt-1">
              Required: <code>name</code>, <code>brand</code>, <code>category</code>, <code>description</code>, <code>sku</code>
            </div>
            <div className="mt-1">
              Helpful optional columns: <code>slug</code>, <code>price</code>, <code>stock</code>, <code>publicationStatus</code>, <code>defaultVariant</code>, <code>imageUrls</code>, <code>highlights</code>, <code>color</code>, <code>ram</code>, <code>storage</code>
            </div>
            <div className="mt-1">
              Advanced optional columns: any <code>spec_*</code> columns for product specs and any <code>attr_*</code> columns for variant attributes.
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={autoCreateImportDependencies}
              onChange={(event) => setAutoCreateImportDependencies(event.target.checked)}
            />
            Auto-create missing brands and categories during import
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadBulkImportTemplate}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Download size={16} /> Download Template
            </button>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
              <Upload size={16} /> Choose CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleBulkImportFile} />
            </label>

            {bulkImportFileName && (
              <div className="text-sm text-slate-600">Loaded: {bulkImportFileName}</div>
            )}
          </div>

          {bulkImportRows.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Products</div>
                  <div className="mt-1 text-2xl font-black text-slate-900">{bulkImportSummary.totalRows}</div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Ready</div>
                  <div className="mt-1 text-2xl font-black text-emerald-900">{bulkImportSummary.validRows}</div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Needs Fixing</div>
                  <div className="mt-1 text-2xl font-black text-amber-900">{bulkImportSummary.invalidRows}</div>
                </div>
              </div>

              <div className="max-h-[320px] overflow-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Rows</th>
                      <th className="px-3 py-2 text-left font-semibold">Product</th>
                      <th className="px-3 py-2 text-left font-semibold">Slug</th>
                      <th className="px-3 py-2 text-left font-semibold">Variants</th>
                      <th className="px-3 py-2 text-left font-semibold">Images</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                      <th className="px-3 py-2 text-left font-semibold">Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkImportRows.map((row) => (
                      <tr key={`bulk-row-${row.rowNumber}`} className="border-t border-slate-100 align-top">
                        <td className="px-3 py-2 text-slate-500">{row.rowNumbers.join(", ")}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{row.name}</td>
                        <td className="px-3 py-2 text-slate-600">{row.slug || "-"}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.skuCount} SKU{row.skuCount === 1 ? "" : "s"}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.imageCount || 0} image{row.imageCount === 1 ? "" : "s"}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClassName(row.status)}`}>
                            {row.status || "draft"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {row.issues.length === 0 ? (
                            <div className="space-y-1">
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                Ready
                              </span>
                              {autoCreateImportDependencies &&
                                (row.missingBrandName || row.missingCategoryName) && (
                                  <div className="text-xs text-sky-700">
                                    Will create:
                                    {row.missingBrandName ? ` brand "${row.missingBrandName}"` : ""}
                                    {row.missingBrandName && row.missingCategoryName ? " and" : ""}
                                    {row.missingCategoryName ? ` category "${row.missingCategoryName}"` : ""}
                                  </div>
                                )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {autoCreateImportDependencies && (row.missingBrandName || row.missingCategoryName) && (
                                <div className="text-xs text-sky-700">
                                  Will create:
                                  {row.missingBrandName ? ` brand "${row.missingBrandName}"` : ""}
                                  {row.missingBrandName && row.missingCategoryName ? " and" : ""}
                                  {row.missingCategoryName ? ` category "${row.missingCategoryName}"` : ""}
                                </div>
                              )}
                              {row.issues.map((issue, issueIndex) => (
                                <div
                                  key={`bulk-row-${row.rowNumber}-issue-${issueIndex}`}
                                  className="text-xs text-amber-700"
                                >
                                  {issue}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {bulkImportFeedback && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">
                Imported {bulkImportFeedback.createdCount} products
              </div>
              <div className="mt-1">
                Failed rows: {bulkImportFeedback.failedCount}
              </div>
              {bulkImportFeedback.created?.length > 0 && (
                <div className="mt-3 space-y-1">
                  {bulkImportFeedback.created.map((item, index) => (
                    <div key={`bulk-created-${index}`} className="text-xs text-slate-600">
                      {item.name}: uploaded {item.uploadedImageCount || 0} image
                      {item.uploadedImageCount === 1 ? "" : "s"}
                    </div>
                  ))}
                </div>
              )}
              {bulkImportFeedback.errors?.length > 0 && (
                <div className="mt-3 space-y-1">
                  {bulkImportFeedback.errors.map((error, index) => (
                    <div key={`bulk-feedback-${index}`} className="text-xs text-amber-700">
                      Row {error.rowNumber}: {error.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeImportModal}
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              disabled={importingProducts}
            >
              Close
            </button>
            <button
              type="button"
              onClick={submitBulkImport}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              disabled={importingProducts || bulkImportSummary.validRows === 0}
            >
              {importingProducts ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
              {importingProducts
                ? "Importing..."
                : `Import ${bulkImportSummary.validRows || 0} Product${bulkImportSummary.validRows === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Quick Add Modal */}
      <Modal
        open={!!createType}
        title={createType === "brand" ? "Create Brand" : "Create Category"}
        subtitle="Add instantly without leaving product form."
        onClose={() => {
          if (!creating) setCreateType(null);
        }}
      >
        {createErr && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {createErr}
          </div>
        )}

        <form onSubmit={handleQuickAddSubmit} className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">Name</label>
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder={createType === "brand" ? "Apple" : "Phones"}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600">Slug</label>
            <input
              value={createSlug}
              onChange={(e) => setCreateSlug(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="auto-generated"
            />
            <div className="mt-1 text-xs text-gray-500">Used in URLs and filters.</div>
          </div>

          {createType === "category" && (
            <div>
              <label className="text-xs font-semibold text-gray-600">
                Variant Attributes (optional)
              </label>
              <input
                value={createAttributes}
                onChange={(e) => setCreateAttributes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="color, ram, storage"
              />
              <div className="mt-1 text-xs text-gray-500">
                Comma separated. Example: switch_type, layout, connectivity.
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => !creating && setCreateType(null)}
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              disabled={creating}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60"
              disabled={creating}
            >
              {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}



