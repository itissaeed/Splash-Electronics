import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";
import { UserContext } from "./context/UserContext";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const prettyDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString();
};

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function Profile() {
  const { user, updateUser } = useContext(UserContext);
  const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    number: "",
  });

  useEffect(() => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      number: user?.number || "",
    });
  }, [user?.name, user?.email, user?.number]);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const { data } = await api.get("/orders/my", { headers: tokenHeader() });
        setOrders(Array.isArray(data) ? data : []);
      } catch (e) {
        setOrders([]);
      }
    };
    loadOrders();
  }, []);

  const initials = useMemo(() => {
    const full = String(user?.name || "").trim();
    if (!full) return "U";
    const parts = full.split(" ");
    return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
  }, [user?.name]);

  const orderStats = useMemo(() => {
    const total = orders.length;
    const delivered = orders.filter((o) => String(o?.status || "").toLowerCase() === "delivered").length;
    const active = orders.filter((o) => {
      const s = String(o?.status || "").toLowerCase();
      return ["pending", "confirmed", "processing", "shipped"].includes(s);
    }).length;
    return { total, delivered, active };
  }, [orders]);

  if (!user) return null;

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    setErrMsg("");
    try {
      const payload = {
        name: String(form.name || "").trim(),
        email: String(form.email || "").trim().toLowerCase(),
        number: String(form.number || "").trim(),
      };
      const { data } = await api.put("/auth/me", payload, { headers: tokenHeader() });
      if (data?.user) {
        updateUser(data.user);
      }
      setEditing(false);
      setSaveMsg(data?.message || "Profile updated successfully.");
    } catch (e2) {
      setErrMsg(e2?.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-100 via-sky-50 to-emerald-100 p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-emerald-300/30 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">My Profile</h1>
              <p className="mt-1 text-sm font-medium text-slate-600">Account details, order summary and saved addresses</p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-slate-900 text-white grid place-items-center text-lg font-bold">
              {initials}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Orders" value={orderStats.total} />
          <StatCard label="Active Orders" value={orderStats.active} hint="Pending to shipped" />
          <StatCard label="Delivered" value={orderStats.delivered} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">Account Information</h2>
              {!editing ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setErrMsg("");
                    setSaveMsg("");
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </button>
              ) : null}
            </div>
            {saveMsg ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{saveMsg}</div>
            ) : null}
            {errMsg ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errMsg}</div>
            ) : null}
            {!editing ? (
              <div className="mt-4 space-y-3">
                <Row label="Name" value={user?.name} />
                <Row label="Email" value={user?.email} />
                <Row label="Phone" value={user?.number} />
                <Row label="Role" value={user?.isAdmin ? "Admin" : "Customer"} />
                <Row label="Last Login" value={prettyDate(user?.lastLoginAt)} />
              </div>
            ) : (
              <form onSubmit={handleProfileSave} className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Full name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Phone</label>
                  <input
                    value={form.number}
                    onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold text-white ${
                      saving ? "bg-slate-400" : "bg-slate-900 hover:bg-slate-800"
                    }`}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setErrMsg("");
                      setSaveMsg("");
                      setForm({
                        name: user?.name || "",
                        email: user?.email || "",
                        number: user?.number || "",
                      });
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">Saved Addresses</h2>
              <Link to="/checkout" className="text-xs font-semibold text-cyan-700 hover:underline">
                Manage at checkout
              </Link>
            </div>
            {Array.isArray(user?.addresses) && user.addresses.length > 0 ? (
              <div className="mt-4 space-y-3">
                {user.addresses.slice(0, 4).map((a) => (
                  <div key={a._id} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-900">
                      {a.label || "Address"} {a.isDefault ? "(Default)" : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {a.addressLine1 || "-"}, {a.area || "-"}, {a.upazila || "-"}, {a.district || "-"}, {a.division || "-"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {a.recipientName || "-"} | {a.phone || "-"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No saved addresses yet.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to="/orders" className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            View My Orders
          </Link>
          <Link to="/" className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Back to Store
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 break-all">{value || "-"}</p>
    </div>
  );
}
