const https = require("https");
const { URL } = require("url");

const postJson = (urlString, payload, headers = {}) =>
  new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const body = JSON.stringify(payload || {});

    const req = https.request(
      {
        method: "POST",
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          ...headers,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(raw || "{}"));
          } catch (e) {
            resolve({ raw });
          }
        });
      }
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });

const getEnv = (key, fallback = "") => process.env[key] || fallback;

const requiredEnv = ["PATHAO_SANDBOX_BASE_URL", "PATHAO_SANDBOX_CLIENT_ID", "PATHAO_SANDBOX_CLIENT_SECRET"];

const validateConfig = () => {
  const missing = requiredEnv.filter((k) => !process.env[k]);
  if (missing.length) {
    const err = new Error(
      `Pathao sandbox is not configured. Missing env: ${missing.join(", ")}`
    );
    err.statusCode = 500;
    throw err;
  }
};

const getAccessToken = async () => {
  validateConfig();

  const baseUrl = getEnv("PATHAO_SANDBOX_BASE_URL");
  const url = `${baseUrl.replace(/\/+$/, "")}/aladdin/api/v1/issue-token`;
  const payload = {
    client_id: getEnv("PATHAO_SANDBOX_CLIENT_ID"),
    client_secret: getEnv("PATHAO_SANDBOX_CLIENT_SECRET"),
    grant_type: "password",
    username: getEnv("PATHAO_SANDBOX_USERNAME"),
    password: getEnv("PATHAO_SANDBOX_PASSWORD"),
  };

  const data = await postJson(url, payload);
  const accessToken =
    data?.access_token || data?.data?.access_token || data?.token || "";

  if (!accessToken) {
    const err = new Error("Failed to get Pathao sandbox access token");
    err.statusCode = 502;
    throw err;
  }

  return accessToken;
};

const createPathaoSandboxShipment = async ({ order }) => {
  const accessToken = await getAccessToken();
  const baseUrl = getEnv("PATHAO_SANDBOX_BASE_URL");

  // Template payload. Adjust field names according to your Pathao merchant sandbox docs.
  const payload = {
    recipient_name: order?.shippingAddress?.recipientName || "Customer",
    recipient_phone: order?.shippingAddress?.phone || "N/A",
    recipient_address: [
      order?.shippingAddress?.addressLine1,
      order?.shippingAddress?.addressLine2,
      order?.shippingAddress?.area,
      order?.shippingAddress?.upazila,
      order?.shippingAddress?.district,
      order?.shippingAddress?.division,
    ]
      .filter(Boolean)
      .join(", "),
    order_id: order?.orderNo,
    item_quantity: Array.isArray(order?.items) ? order.items.length : 1,
    item_weight: Number(getEnv("PATHAO_SANDBOX_DEFAULT_WEIGHT_KG", "0.5")),
    amount_to_collect: Number(order?.pricing?.grandTotal || 0),
    item_description: "Splash Electronics Order",
  };

  const url = `${baseUrl.replace(/\/+$/, "")}/aladdin/api/v1/orders`;
  const data = await postJson(url, payload, {
    Authorization: `Bearer ${accessToken}`,
  });

  // Template field mapping. Update keys after verifying actual sandbox response.
  const consignmentId =
    data?.data?.consignment_id ||
    data?.data?.consignmentId ||
    data?.consignment_id ||
    data?.consignmentId;
  const trackingNumber =
    data?.data?.tracking_number ||
    data?.data?.trackingNumber ||
    data?.tracking_number ||
    data?.trackingNumber;

  if (!consignmentId && !trackingNumber) {
    const err = new Error("Pathao sandbox did not return tracking data");
    err.statusCode = 502;
    throw err;
  }

  const trackingId = String(trackingNumber || consignmentId);
  const bookingRef = String(consignmentId || trackingNumber);

  return {
    provider: "pathao_sandbox",
    courier: "Pathao",
    trackingId,
    bookingRef,
    trackingUrl: `https://www.google.com/search?q=${encodeURIComponent(
      `Pathao tracking ${trackingId}`
    )}`,
    pickupDate: new Date(),
    courierCharge:
      String(order?.shippingAddress?.division || "").trim().toLowerCase() === "dhaka"
        ? 60
        : 100,
    raw: data,
  };
};

module.exports = {
  createPathaoSandboxShipment,
};
