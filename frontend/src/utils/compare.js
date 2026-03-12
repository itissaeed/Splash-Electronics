const STORAGE_KEY = "compare_products_v1";
const COMPARE_EVENT = "compare:updated";
const COMPARE_LIMIT = 4;

const getKeyFromItem = (item) =>
  item?.key || item?.slug || item?.id || item?._id || "";

const normalizeItem = (product) => {
  const id = product?._id || product?.id || "";
  const slug = product?.slug || "";
  const key = slug || id;
  return {
    id,
    slug,
    key,
    name: product?.name || "Product",
    image:
      product?.variants?.[0]?.images?.[0]?.url ||
      product?.images?.[0]?.url ||
      "",
    price: product?.basePrice ?? product?.variants?.[0]?.price ?? product?.price ?? 0,
    brand: product?.brand?.name || product?.brand || "",
  };
};

const sanitizeItems = (items) => {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  return items
    .map((item) => ({
      ...item,
      key: getKeyFromItem(item),
    }))
    .filter((item) => {
      if (!item.key || seen.has(item.key)) return false;
      seen.add(item.key);
      return true;
    });
};

const emitChange = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COMPARE_EVENT));
};

const saveItems = (items) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  emitChange();
};

const getCompareItems = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return sanitizeItems(JSON.parse(raw));
  } catch {
    return [];
  }
};

const addCompareItem = (product) => {
  const item = normalizeItem(product);
  if (!item.key) {
    return { ok: false, reason: "invalid", items: getCompareItems() };
  }

  const items = getCompareItems();
  if (items.find((i) => i.key === item.key)) {
    return { ok: true, reason: "exists", items };
  }
  if (items.length >= COMPARE_LIMIT) {
    return { ok: false, reason: "limit", items };
  }
  const next = [...items, item];
  saveItems(next);
  return { ok: true, reason: "added", items: next };
};

const removeCompareItem = (productOrKey) => {
  const key =
    typeof productOrKey === "string"
      ? productOrKey
      : getKeyFromItem(productOrKey);
  if (!key) return { ok: false, items: getCompareItems() };
  const items = getCompareItems();
  const next = items.filter((item) => item.key !== key);
  saveItems(next);
  return { ok: true, items: next };
};

const toggleCompareItem = (product) => {
  const item = normalizeItem(product);
  if (!item.key) {
    return { ok: false, reason: "invalid", items: getCompareItems() };
  }

  const items = getCompareItems();
  const exists = items.find((i) => i.key === item.key);
  if (exists) {
    const next = items.filter((i) => i.key !== item.key);
    saveItems(next);
    return { ok: true, reason: "removed", items: next };
  }

  if (items.length >= COMPARE_LIMIT) {
    return { ok: false, reason: "limit", items };
  }

  const next = [...items, item];
  saveItems(next);
  return { ok: true, reason: "added", items: next };
};

const clearCompareItems = () => {
  saveItems([]);
};

const isInCompare = (product, items = null) => {
  const key = getKeyFromItem(product);
  if (!key) return false;
  const list = items || getCompareItems();
  return list.some((item) => item.key === key);
};

export {
  STORAGE_KEY as COMPARE_STORAGE_KEY,
  COMPARE_EVENT,
  COMPARE_LIMIT,
  getCompareItems,
  addCompareItem,
  removeCompareItem,
  toggleCompareItem,
  clearCompareItems,
  isInCompare,
  normalizeItem as normalizeCompareItem,
  getKeyFromItem as getCompareKey,
};
