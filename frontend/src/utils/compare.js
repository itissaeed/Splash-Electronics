const STORAGE_KEY = "compare_products_v1";
const COMPARE_EVENT = "compare:updated";
const COMPARE_LIMIT = 4;

const getKeyFromItem = (item) =>
  item?.key || item?.slug || item?.id || item?._id || "";

const normalizeCategory = (product) => {
  const category = product?.category;
  const id =
    product?.categoryId ||
    category?._id ||
    category?.id ||
    "";
  const slug =
    product?.categorySlug ||
    category?.slug ||
    "";
  const name =
    product?.categoryName ||
    category?.name ||
    (typeof category === "string" ? category : "");
  const normalizedName = String(name || "").trim();
  const key = id || slug || normalizedName.toLowerCase();
  return { id, slug, name: normalizedName, key };
};

const normalizeItem = (product) => {
  const id = product?._id || product?.id || "";
  const slug = product?.slug || "";
  const key = slug || id;
  const category = normalizeCategory(product);
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
    category: category.name
      ? {
          _id: category.id,
          slug: category.slug,
          name: category.name,
        }
      : null,
    categoryId: category.id,
    categorySlug: category.slug,
    categoryName: category.name,
    categoryKey: category.key,
  };
};

const sanitizeItems = (items) => {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  return items
    .map((item) => {
      const category = normalizeCategory(item);
      return {
        ...item,
        key: getKeyFromItem(item),
        categoryId: item?.categoryId || category.id,
        categorySlug: item?.categorySlug || category.slug,
        categoryName: item?.categoryName || category.name,
        categoryKey: item?.categoryKey || category.key,
      };
    })
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

const isSameCategory = (left, right) => {
  const leftCategory = normalizeCategory(left);
  const rightCategory = normalizeCategory(right);
  if (!leftCategory.key || !rightCategory.key) {
    return leftCategory.key === rightCategory.key;
  }
  return leftCategory.key === rightCategory.key;
};

const getCompareEligibility = (product, items = null) => {
  const item = normalizeItem(product);
  const list = items || getCompareItems();

  if (!item.key) {
    return { ok: false, reason: "invalid", items: list };
  }

  const exists = list.find((i) => i.key === item.key);
  if (exists) {
    return { ok: true, reason: "exists", items: list };
  }

  if (list.length >= COMPARE_LIMIT) {
    return { ok: false, reason: "limit", items: list };
  }

  if (list.length && !isSameCategory(list[0], item)) {
    return {
      ok: false,
      reason: "category",
      items: list,
      activeCategory: normalizeCategory(list[0]),
      nextCategory: normalizeCategory(item),
    };
  }

  return {
    ok: true,
    reason: "ready",
    items: list,
    activeCategory: list.length ? normalizeCategory(list[0]) : normalizeCategory(item),
    nextCategory: normalizeCategory(item),
  };
};

const addCompareItem = (product) => {
  const item = normalizeItem(product);
  const eligibility = getCompareEligibility(item);
  if (!eligibility.ok) return eligibility;

  const items = eligibility.items;
  if (items.find((i) => i.key === item.key)) {
    return { ok: true, reason: "exists", items };
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

  const eligibility = getCompareEligibility(item, items);
  if (!eligibility.ok) return eligibility;

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
  getCompareEligibility,
  normalizeCategory as getCompareCategory,
};
