import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldX,
  Wallet,
} from "lucide-react";
import api from "../../../utils/api";

const tokenHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const STATUS_FLOW = ["requested", "approved", "picked", "received", "refunded"];
const STATUS_OPTIONS = [...STATUS_FLOW, "rejected"];

const STATUS_META = {
  requested: {
    label: "Requested",
    tone: "bg-amber-100 text-amber-700 border-amber-200",
    soft: "bg-amber-50 text-amber-700",
    icon: ClipboardList,
  },
  approved: {
    label: "Approved",
    tone: "bg-sky-100 text-sky-700 border-sky-200",
    soft: "bg-sky-50 text-sky-700",
    icon: CheckCircle2,
  },
  picked: {
    label: "Pickup In Progress",
    tone: "bg-violet-100 text-violet-700 border-violet-200",
    soft: "bg-violet-50 text-violet-700",
    icon: RotateCcw,
  },
  received: {
    label: "Received",
    tone: "bg-emerald-100 text-emerald-700 border-emerald-200",
    soft: "bg-emerald-50 text-emerald-700",
    icon: PackageCheck,
  },
  refunded: {
    label: "Refunded",
    tone: "bg-teal-100 text-teal-700 border-teal-200",
    soft: "bg-teal-50 text-teal-700",
    icon: Wallet,
  },
  rejected: {
    label: "Rejected",
    tone: "bg-rose-100 text-rose-700 border-rose-200",
    soft: "bg-rose-50 text-rose-700",
    icon: ShieldX,
  },
};

const NEXT_ACTIONS = {
  requested: ["approved", "rejected"],
  approved: ["picked", "rejected"],
  picked: ["received"],
  received: ["refunded"],
  refunded: [],
  rejected: [],
};

const money = (n) => `BDT ${Number(n || 0).toLocaleString("en-BD")}`;
const nice = (n) => Number(n || 0).toLocaleString("en-BD");

const timeOptionLabel = (value) => {
  if (value === "WITHIN_24_HOURS") return "Within 24 hours";
  if (value === "WITHIN_3_DAYS") return "Within 3 days";
  if (value === "WITHIN_7_DAYS") return "Within 7 days";
  return "-";
};

const ageInDays = (value) => {
  const created = new Date(value).getTime();
  const diff = Date.now() - created;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
};

const queueSlaMeta = (row) => {
  const days = ageInDays(row?.createdAt);
  if (row?.status === "refunded" || row?.status === "rejected") {
    return { label: "Closed", tone: "bg-slate-100 text-slate-700" };
  }
  if (days >= 5) return { label: `${days}d open · Needs attention`, tone: "bg-rose-100 text-rose-700" };
  if (days >= 2) return { label: `${days}d open · In progress`, tone: "bg-amber-100 text-amber-700" };
  return { label: `${days}d open · On track`, tone: "bg-emerald-100 text-emerald-700" };
};

function StatCard({ label, value, hint, icon: Icon, accent }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${accent}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
          {hint ? <p className="mt-2 text-xs font-medium text-slate-500">{hint}</p> : null}
        </div>
        <span className="rounded-2xl border border-white/70 bg-white/80 p-2 text-slate-700 shadow-sm">
          <Icon size={16} strokeWidth={2.2} />
        </span>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] || STATUS_META.requested;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.tone}`}>
      <meta.icon size={12} />
      {meta.label}
    </span>
  );
}

function StageTracker({ status }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUS_FLOW.map((step, idx) => {
        const activeIndex = STATUS_FLOW.indexOf(status);
        const isDone = activeIndex >= idx;
        const isRejected = status === "rejected";
        return (
          <React.Fragment key={step}>
            <div
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                isRejected
                  ? "bg-slate-100 text-slate-400"
                  : isDone
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {STATUS_META[step].label}
            </div>
            {idx < STATUS_FLOW.length - 1 ? <ArrowRight size={12} className="text-slate-300" /> : null}
          </React.Fragment>
        );
      })}
      {status === "rejected" ? (
        <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-700">Rejected</span>
      ) : null}
    </div>
  );
}

function RequestCard({ row, active, onSelect }) {
  const sla = queueSlaMeta(row);
  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      className={`w-full rounded-3xl border p-4 text-left transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-md"
          : "border-slate-200 bg-white/90 text-slate-900 shadow-sm hover:border-cyan-300 hover:bg-cyan-50/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`truncate text-sm font-bold ${active ? "text-white" : "text-slate-900"}`}>{row?.order?.orderNo || row?._id}</p>
          <p className={`mt-1 text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>
            {row?.user?.name || "Customer"} · {row?.user?.email || "No email"}
          </p>
        </div>
        <StatusPill status={row?.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <span className={`rounded-full px-2 py-1 font-semibold ${active ? "bg-white/10 text-slate-200" : sla.tone}`}>{sla.label}</span>
        <span className={`rounded-full px-2 py-1 font-semibold ${active ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
          {nice(row?.items?.length || 0)} item line{(row?.items?.length || 0) > 1 ? "s" : ""}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
        <div>
          <p className={active ? "text-slate-400" : "text-slate-500"}>Amount</p>
          <p className={`mt-1 font-semibold ${active ? "text-white" : "text-slate-900"}`}>{money(row?.order?.pricing?.grandTotal || 0)}</p>
        </div>
        <div>
          <p className={active ? "text-slate-400" : "text-slate-500"}>Requested</p>
          <p className={`mt-1 font-semibold ${active ? "text-white" : "text-slate-900"}`}>
            {new Date(row.createdAt).toLocaleDateString("en-BD")}
          </p>
        </div>
      </div>
    </button>
  );
}

function DetailRow({ label, value, muted = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-right text-sm font-medium ${muted ? "text-slate-500" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export default function AdminReturns() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/returns/my", { headers: tokenHeader() });
      const items = Array.isArray(data) ? data : [];
      setRows(items);
      setSelectedId((prev) => prev || items[0]?._id || "");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to load return/refund requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row?.status !== statusFilter) return false;
      if (!normalized) return true;

      const haystack = [
        row?._id,
        row?.order?.orderNo,
        row?.user?.name,
        row?.user?.email,
        row?.customerRefundPreference?.reason,
        row?.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [rows, statusFilter, query]);

  useEffect(() => {
    if (!filteredRows.some((row) => row._id === selectedId)) {
      setSelectedId(filteredRows[0]?._id || "");
    }
  }, [filteredRows, selectedId]);

  const selected = filteredRows.find((row) => row._id === selectedId) || filteredRows[0] || null;

  const summary = useMemo(() => {
    const out = {
      total: rows.length,
      open: 0,
      refunded: 0,
      urgent: 0,
      refundAmount: 0,
    };

    rows.forEach((row) => {
      if (!["refunded", "rejected"].includes(row?.status)) out.open += 1;
      if (row?.status === "refunded") out.refunded += 1;
      if (!["refunded", "rejected"].includes(row?.status) && ageInDays(row?.createdAt) >= 5) out.urgent += 1;
      out.refundAmount += Number(row?.refund?.amount || row?.order?.pricing?.grandTotal || 0);
    });

    return out;
  }, [rows]);

  const updateStatus = async (row, nextStatus) => {
    try {
      setUpdatingId(row._id);
      const payload = { status: nextStatus };
      if (nextStatus === "refunded") {
        payload.refund = {
          amount: Number(row?.refund?.amount || row?.order?.pricing?.grandTotal || 0),
          method: row?.refund?.method || (row?.order?.payment?.method === "COD" ? "CASH" : "BANK"),
          transactionId: row?.refund?.transactionId || "",
        };
      }
      await api.put(`/returns/admin/${row._id}/status`, payload, {
        headers: tokenHeader(),
      });
      await load();
      setSelectedId(row._id);
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Failed to update return/refund status");
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.2),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.14),_transparent_26%),linear-gradient(135deg,_#f8fafc,_#ffffff_45%,_#eff6ff)] p-5 sm:p-6">
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-sky-700">Returns Operations</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Returns And Refund Control Center</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium text-slate-600">
              Real-world return centers focus on queue health, fast review, stage-based processing, and refund visibility. This page now follows that pattern.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <RefreshCw size={16} />
            Refresh Queue
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full bg-white/90 px-3 py-1 font-semibold text-slate-700">Request review</span>
          <span className="rounded-full bg-white/90 px-3 py-1 font-semibold text-slate-700">Pickup and receiving</span>
          <span className="rounded-full bg-white/90 px-3 py-1 font-semibold text-slate-700">Refund completion</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Requests" value={nice(summary.total)} hint="All recorded return cases" icon={ClipboardList} accent="bg-sky-400/35" />
        <StatCard label="Open Queue" value={nice(summary.open)} hint="Still waiting for final closure" icon={Clock3} accent="bg-amber-400/35" />
        <StatCard label="Urgent Cases" value={nice(summary.urgent)} hint="Open for 5+ days" icon={AlertTriangle} accent="bg-rose-400/35" />
        <StatCard label="Refund Exposure" value={money(summary.refundAmount)} hint="Potential processed value" icon={Wallet} accent="bg-emerald-400/35" />
      </div>

      <div className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2">
            <Search size={16} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by order no, request id, customer, email, reason..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Filter</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_META[status]?.label || status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        <div className="space-y-3">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading return queue...</div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No return requests found for this filter.</div>
          ) : (
            filteredRows.map((row) => (
              <RequestCard key={row._id} row={row} active={selected?._id === row._id} onSelect={setSelectedId} />
            ))
          )}
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
          {!selected ? (
            <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-slate-500">Select a return request to inspect details.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black tracking-tight text-slate-900">{selected?.order?.orderNo || selected?._id}</h2>
                    <StatusPill status={selected?.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Request ID {selected._id} · Created {new Date(selected.createdAt).toLocaleString("en-BD")}
                  </p>
                </div>
                <div className={`rounded-full px-3 py-1 text-[11px] font-semibold ${queueSlaMeta(selected).tone}`}>
                  {queueSlaMeta(selected).label}
                </div>
              </div>

              <StageTracker status={selected?.status} />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <h3 className="text-sm font-bold text-slate-900">Customer And Refund Preference</h3>
                    <div className="mt-3 divide-y divide-slate-200">
                      <DetailRow label="Customer" value={selected?.user?.name || "-"} />
                      <DetailRow label="Email" value={selected?.user?.email || "-"} />
                      <DetailRow label="Phone" value={selected?.user?.phone || "-"} muted={!selected?.user?.phone} />
                      <DetailRow label="Reason" value={selected?.customerRefundPreference?.reason || selected?.notes || "-"} />
                      <DetailRow label="Preferred timeline" value={timeOptionLabel(selected?.customerRefundPreference?.refundTimeOption)} />
                      <DetailRow label="Payment method" value={selected?.order?.payment?.method || "-"} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-bold text-slate-900">Returned Items</h3>
                    <div className="mt-3 space-y-3">
                      {(selected?.items || []).map((item) => (
                        <div key={item._id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item?.reason || "Return item"}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Product ID {String(item?.product || "-")} · Variant {String(item?.variantId || "-")}
                              </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                              Qty {nice(item?.qty || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Financial Snapshot</p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] text-slate-400">Order Total</p>
                        <p className="mt-1 text-lg font-bold">{money(selected?.order?.pricing?.grandTotal || 0)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="text-[11px] text-slate-400">Refund Amount</p>
                        <p className="mt-1 text-lg font-bold">{money(selected?.refund?.amount || selected?.order?.pricing?.grandTotal || 0)}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl bg-white/5 p-3 text-xs text-slate-300">
                      Real sites usually wait for review or receipt before issuing final refund unless the case is auto-approved.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <h3 className="text-sm font-bold text-slate-900">Recommended Next Step</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {(NEXT_ACTIONS[selected?.status] || []).length
                        ? `Move this case from ${STATUS_META[selected?.status]?.label || selected?.status} to the next operational stage.`
                        : "This case is already closed. No further operational action is needed."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(NEXT_ACTIONS[selected?.status] || []).map((nextStatus) => (
                        <button
                          key={nextStatus}
                          type="button"
                          disabled={updatingId === selected._id}
                          onClick={() => updateStatus(selected, nextStatus)}
                          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Mark As {STATUS_META[nextStatus]?.label || nextStatus}
                        </button>
                      ))}
                      {!NEXT_ACTIONS[selected?.status]?.length ? null : (
                        <button
                          type="button"
                          disabled={updatingId === selected._id || selected?.status === "rejected"}
                          onClick={() => updateStatus(selected, "rejected")}
                          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reject Request
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-bold text-slate-900">Admin Notes</h3>
                    <p className="mt-2 text-sm text-slate-600">{selected?.notes || "No internal notes recorded yet."}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
