import React, { useContext, useMemo } from "react";
import { UserContext } from "../../context/UserContext";

const prettyDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
};

function InfoRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 break-all">{value || "-"}</p>
    </div>
  );
}

export default function AdminProfile() {
  const { user } = useContext(UserContext);

  const roleLabel = useMemo(() => {
    const roles = Array.isArray(user?.roles) ? user.roles : [];
    if (roles.length) return roles.join(", ");
    if (user?.isAdmin) return "admin";
    return "customer";
  }, [user]);

  const initials = useMemo(() => {
    const name = String(user?.name || "").trim();
    if (!name) return "AD";
    const parts = name.split(" ");
    return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
  }, [user?.name]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-100 via-sky-50 to-emerald-100 p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Admin Profile</h1>
            <p className="mt-1 text-sm font-medium text-slate-600">Your account details and admin access profile</p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white grid place-items-center text-lg font-bold">
            {initials}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <InfoRow label="Full Name" value={user?.name} />
        <InfoRow label="Email" value={user?.email} />
        <InfoRow label="Phone" value={user?.number} />
        <InfoRow label="Role" value={roleLabel} />
        <InfoRow label="Admin Access" value={user?.isAdmin ? "Enabled" : "Disabled"} />
        <InfoRow label="Last Login" value={prettyDate(user?.lastLoginAt)} />
      </div>

      <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h3 className="text-sm font-bold text-slate-900">Account ID</h3>
        <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 break-all">
          {user?._id || "-"}
        </p>
      </div>
    </div>
  );
}
