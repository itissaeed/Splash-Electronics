import React, { useEffect, useState } from "react";
import api from "../../../utils/api";
import { isAdminUser } from "../../../utils/auth";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

function MetricCard({ label, value, subtitle }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-2 break-all text-xl font-extrabold text-gray-900">
        {value}
      </div>
      {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
    </div>
  );
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [promoteCandidates, setPromoteCandidates] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState("all");
  const [activeTab, setActiveTab] = useState("users");
  const [promoteKeyword, setPromoteKeyword] = useState("");
  const [hasSearchedPromote, setHasSearchedPromote] = useState(false);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [busyUserId, setBusyUserId] = useState("");

  const fetchCustomers = async (opts = {}) => {
    try {
      setLoading(true);
      setErrMsg("");

      const params = {
        page: opts.page ?? page,
        limit,
        role: opts.role ?? role,
      };
      const kw = (opts.keyword ?? keyword).trim();
      if (kw) params.keyword = kw;

      const { data } = await api.get("/admin/customers", {
        headers: tokenHeader(),
        params,
      });

      setCustomers(data.users || []);
      setPage(data.page || 1);
      setPages(data.pages || 1);
      setMetrics(data.metrics || null);
    } catch (e) {
      console.error(e);
      setErrMsg(
        e?.response?.data?.message ||
          "Failed to load users. Check /api/admin/customers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPromoteCandidates = async (searchTerm = promoteKeyword) => {
    try {
      setPromoteLoading(true);
      setErrMsg("");
      setHasSearchedPromote(true);

      const params = {
        page: 1,
        limit: 10,
        role: "customer",
      };
      const kw = searchTerm.trim();
      if (kw) params.keyword = kw;

      const { data } = await api.get("/admin/customers", {
        headers: tokenHeader(),
        params,
      });

      setPromoteCandidates(data.users || []);
    } catch (e) {
      console.error(e);
      setErrMsg(e?.response?.data?.message || "Failed to search customers.");
    } finally {
      setPromoteLoading(false);
    }
  };

  const onSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers({ page: 1 });
  };

  const onPromoteSearchSubmit = (e) => {
    e.preventDefault();
    fetchPromoteCandidates(promoteKeyword);
  };

  const goPage = (newPage) => {
    if (newPage < 1 || newPage > pages) return;
    fetchCustomers({ page: newPage });
  };

  const handleRoleChange = async (userId, nextRole) => {
    try {
      setBusyUserId(userId);
      setErrMsg("");
      setActionMsg("");

      const { data } = await api.patch(
        `/admin/customers/${userId}/role`,
        { role: nextRole },
        { headers: tokenHeader() }
      );

      setActionMsg(data?.message || "User role updated.");
      if (nextRole === "admin") {
        setPromoteCandidates((prev) => prev.filter((user) => user._id !== userId));
      }
      await fetchCustomers();
    } catch (e) {
      console.error(e);
      setErrMsg(e?.response?.data?.message || "Failed to update user role.");
    } finally {
      setBusyUserId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
            Users
          </h1>
          <p className="text-sm text-gray-500">
            Browse accounts and manage admin access from one clean place
          </p>
        </div>
      </div>

      {errMsg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errMsg}
        </div>
      ) : null}

      {actionMsg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {actionMsg}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total customers"
          value={metrics?.customerCount ?? metrics?.totalUsers ?? 0}
          subtitle="Non-admin accounts"
        />
        <MetricCard
          label="Total users"
          value={metrics?.totalUsers ?? 0}
          subtitle="Including admins"
        />
        <MetricCard
          label="Admins"
          value={metrics?.adminCount ?? 0}
          subtitle="Users with admin rights"
        />
        <MetricCard
          label="Joined last 30 days"
          value={metrics?.newUsersLast30Days ?? 0}
          subtitle="All roles"
        />
      </div>

      <div className="rounded-3xl border bg-white shadow-sm">
        <div className="border-b px-4 py-4">
          <div className="inline-flex rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "users"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Users
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("make-admin")}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === "make-admin"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Make an Admin
            </button>
          </div>
        </div>

        {activeTab === "users" ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4 border-b px-4 py-4">
              <div>
                <div className="font-extrabold text-gray-900">
                  Users ({customers.length} on this page)
                </div>
                <div className="text-xs text-gray-500">
                  Page {page} of {pages}
                </div>
              </div>

              <form
                onSubmit={onSearchSubmit}
                className="flex flex-wrap items-center gap-2"
              >
                <select
                  value={role}
                  onChange={(e) => {
                    const nextRole = e.target.value;
                    setRole(nextRole);
                    fetchCustomers({ page: 1, role: nextRole });
                  }}
                  className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="all">All users</option>
                  <option value="customer">Customers</option>
                  <option value="admin">Admins</option>
                </select>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Search by name, email or phone"
                  className="w-52 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 sm:w-72"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Search
                </button>
              </form>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold">Role</th>
                    <th className="px-4 py-3 text-left font-semibold">Last login</th>
                    <th className="px-4 py-3 text-left font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-gray-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-gray-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    customers.map((u) => {
                      const adminUser = isAdminUser(u);

                      return (
                        <tr key={u._id} className="border-t">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{u.name}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{u.email}</td>
                          <td className="px-4 py-3 text-gray-700">{u.number || "-"}</td>
                          <td className="px-4 py-3 text-xs">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-1 font-semibold ${
                                adminUser
                                  ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                                  : "border-emerald-100 bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {adminUser ? "Admin" : "Customer"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {u.lastLoginAt
                              ? new Date(u.lastLoginAt).toLocaleDateString()
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {u.createdAt
                              ? new Date(u.createdAt).toLocaleDateString()
                              : "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {pages > 1 ? (
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-gray-600">
                <button
                  onClick={() => goPage(page - 1)}
                  disabled={page <= 1}
                  className={`rounded-xl border px-3 py-1 ${
                    page <= 1
                      ? "cursor-not-allowed bg-gray-50 text-gray-400"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  Previous
                </button>

                <span>
                  Page {page} of {pages}
                </span>

                <button
                  onClick={() => goPage(page + 1)}
                  disabled={page >= pages}
                  className={`rounded-xl border px-3 py-1 ${
                    page >= pages
                      ? "cursor-not-allowed bg-gray-50 text-gray-400"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="space-y-4 px-4 py-4">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
              <div className="font-semibold text-slate-900">Make an Admin</div>
              <p className="mt-1 text-sm text-slate-600">
                Search customer accounts here and promote only the right person to
                admin access.
              </p>
            </div>

            <form
              onSubmit={onPromoteSearchSubmit}
              className="flex flex-wrap items-center gap-2"
            >
              <input
                value={promoteKeyword}
                onChange={(e) => setPromoteKeyword(e.target.value)}
                placeholder="Search customer by name, email or phone"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 sm:w-80"
              />
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Search Customer
              </button>
            </form>

            <div className="overflow-hidden rounded-2xl border">
              <div className="hidden gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:grid sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_auto]">
                <div>Name</div>
                <div>Email</div>
                <div>Phone</div>
                <div>Action</div>
              </div>

              {promoteLoading ? (
                <div className="px-4 py-6 text-sm text-gray-500">
                  Searching customers...
                </div>
              ) : !hasSearchedPromote ? (
                <div className="px-4 py-6 text-sm text-gray-500">
                  Search for a customer first, then make that user an admin.
                </div>
              ) : promoteCandidates.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500">
                  No customer found. Try a different name, email, or phone number.
                </div>
              ) : (
                promoteCandidates.map((user) => (
                  <div
                    key={user._id}
                    className="grid grid-cols-1 gap-3 border-t px-4 py-4 text-sm text-slate-700 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_auto] sm:items-center"
                  >
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                        Name
                      </div>
                      <div className="font-semibold text-slate-900">{user.name}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                        Email
                      </div>
                      <div className="break-all">{user.email}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                        Phone
                      </div>
                      <div>{user.number || "-"}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                        Action
                      </div>
                      <button
                        type="button"
                        disabled={busyUserId === user._id}
                        onClick={() => handleRoleChange(user._id, "admin")}
                        className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyUserId === user._id ? "Saving..." : "Make admin"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
