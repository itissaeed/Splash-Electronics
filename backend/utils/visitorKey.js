const getVisitorKey = (req) => {
  const rawHeader = String(req.headers["x-visitor-id"] || "").trim();
  if (rawHeader) return rawHeader.slice(0, 120);

  const userId = req.user?._id ? String(req.user._id) : "";
  if (userId) return `user:${userId}`;

  return "";
};

module.exports = {
  getVisitorKey,
};
