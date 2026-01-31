// utils/orderNo.js
module.exports = function generateOrderNo() {
  // SPL-YYYYMMDD-XXXX
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `SPL-${y}${m}${day}-${rand}`;
};
