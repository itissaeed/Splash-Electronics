export const normalizeRoles = (roles = []) => {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((role) => String(role || "").toLowerCase().trim())
    .filter(Boolean);
};

export const isAdminUser = (user) => {
  if (!user) return false;
  if (user.isAdmin === true) return true;

  const roles = normalizeRoles(user.roles);
  const roleField = String(user.role || "").toLowerCase().trim();

  return roles.includes("admin") || roleField === "admin";
};
