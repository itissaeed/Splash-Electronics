import React, { useEffect, useState } from "react";
import api from "../../../utils/api";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

function MetricCard({ label, value, subtitle }) {
  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="mt-2 text-xl font-extrabold text-gray-900 break-all">
        {value}
      </div>
      {subtitle && (
        <div className="mt-1 text-xs text-gray-500">{subtitle}</div>
      )}
    </div>
  );
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const fetchCustomers = async (opts = {}) => {
    try {
      setLoading(true);
      setErrMsg("");

      const params = {
        page: opts.page ?? page,
        limit,
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
          "Failed to load customers. Check /api/admin/customers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers({ page: 1 });
  };

  const goPage = (newPage) => {
    if (newPage < 1 || newPage > pages) return;
    fetchCustomers({ page: newPage });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Customers
          </h1>
          <p className="text-sm text-gray-500">
            View and search registered customers
          </p>
        </div>

        <form
          onSubmit={onSearchSubmit}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search by name, email or phone"
            className="w-52 sm:w-72 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-500"
          >
            Search
          </button>
        </form>
      </div>

      {errMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errMsg}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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

      {/* Table */}
      <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-extrabold text-gray-900">
            Customers ({customers.length} on this page)
          </div>
          <div className="text-xs text-gray-500">
            Page {page} of {pages}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Name</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Phone</th>
                <th className="text-left px-4 py-3 font-semibold">Role</th>
                <th className="text-left px-4 py-3 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-gray-500">
                    Loading customers…
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-gray-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((u) => (
                  <tr key={u._id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        {u.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {u.email}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {u.number}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2 py-1 font-semibold text-emerald-700">
                        Customer
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t text-sm text-gray-600">
            <button
              onClick={() => goPage(page - 1)}
              disabled={page <= 1}
              className={`rounded-xl px-3 py-1 border ${
                page <= 1
                  ? "bg-gray-50 text-gray-400 cursor-not-allowed"
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
              className={`rounded-xl px-3 py-1 border ${
                page >= pages
                  ? "bg-gray-50 text-gray-400 cursor-not-allowed"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
