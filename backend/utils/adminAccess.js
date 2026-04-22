const normalizeRoles = (roles = []) => {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((role) => String(role || "").toLowerCase().trim())
    .filter(Boolean);
};

const isUserAdmin = (user) => {
  if (!user) return false;
  if (user.isAdmin === true) return true;

  const roles = normalizeRoles(user.roles);
  const roleField = String(user.role || "").toLowerCase().trim();

  return roles.includes("admin") || roleField === "admin";
};

const buildRoleState = (isAdmin) => ({
  isAdmin: Boolean(isAdmin),
  roles: isAdmin ? ["admin"] : ["customer"],
});

const adminUserQuery = () => ({
  $or: [
    { isAdmin: true },
    { roles: "admin" },
    { role: "admin" },
  ],
});

const customerUserQuery = () => ({
  $nor: [
    { isAdmin: true },
    { roles: "admin" },
    { role: "admin" },
  ],
});

module.exports = {
  normalizeRoles,
  isUserAdmin,
  buildRoleState,
  adminUserQuery,
  customerUserQuery,
};
