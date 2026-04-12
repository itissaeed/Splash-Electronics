import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "../../utils/api";

const normalizeStatus = (status) => {
  const value = String(status || "").toLowerCase();
  if (["paid", "success", "valid", "validated"].includes(value)) return "paid";
  if (["failed", "cancelled", "canceled"].includes(value)) {
    return value === "canceled" ? "cancelled" : value;
  }
  if (["unpaid", "pending"].includes(value)) return value;
  return "";
};

export default function OrderSuccess() {
  const { orderNo } = useParams();
  const location = useLocation();
  const [paymentStatus, setPaymentStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get("payment");

    const load = async () => {
      try {
        const { data } = await api.get(`/orders/${orderNo}`);
        const dbStatus = normalizeStatus(data?.payment?.status);
        const queryStatus = normalizeStatus(statusParam);
        const status =
          dbStatus === "paid" || dbStatus === "failed" || dbStatus === "cancelled"
            ? dbStatus
            : queryStatus || dbStatus || "unpaid";
        setPaymentStatus(status);
      } catch (e) {
        setPaymentStatus(normalizeStatus(statusParam) || "pending");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orderNo, location.search]);

  const viewModel = useMemo(() => {
    if (loading) {
      return {
        icon: "...",
        title: "Checking payment",
        subtitle: "We are verifying your payment result and order status.",
        badgeLabel: "Checking payment status...",
        badgeClass: "bg-slate-100 text-slate-600",
        panelClass: "border-slate-200 bg-white",
        iconClass: "text-slate-500",
        primaryAction: { to: `/order/${orderNo}`, label: "View Order Details", solid: true },
        secondaryAction: { to: "/", label: "Back to Home" },
      };
    }

    if (paymentStatus === "paid") {
      return {
        icon: "OK",
        title: "Order confirmed",
        subtitle: "Your payment was successful and the order is now recorded in our system.",
        badgeLabel: "Payment confirmed",
        badgeClass: "bg-green-50 text-green-700",
        panelClass: "border-green-100 bg-white",
        iconClass: "text-green-600",
        primaryAction: { to: `/order/${orderNo}`, label: "View Order Details", solid: true },
        secondaryAction: { to: "/", label: "Back to Home" },
      };
    }

    if (paymentStatus === "failed" || paymentStatus === "cancelled") {
      return {
        icon: "!",
        title: paymentStatus === "cancelled" ? "Payment cancelled" : "Payment failed",
        subtitle:
          "Your online payment was not completed. You can return to checkout and try again.",
        badgeLabel: paymentStatus === "cancelled" ? "Payment cancelled" : "Payment not completed",
        badgeClass: "bg-red-50 text-red-700",
        panelClass: "border-red-100 bg-white",
        iconClass: "text-red-600",
        primaryAction: { to: "/checkout", label: "Try Payment Again", solid: true },
        secondaryAction: { to: `/order/${orderNo}`, label: "View Order Details" },
      };
    }

    return {
      icon: "...",
      title: "Order received",
      subtitle: "Your order exists, but the payment is still pending confirmation.",
      badgeLabel: "Payment pending",
      badgeClass: "bg-amber-50 text-amber-700",
      panelClass: "border-amber-100 bg-white",
      iconClass: "text-amber-600",
      primaryAction: { to: `/order/${orderNo}`, label: "View Order Details", solid: true },
      secondaryAction: { to: "/checkout", label: "Back to Checkout" },
    };
  }, [loading, orderNo, paymentStatus]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className={`rounded-2xl border p-8 shadow-sm ${viewModel.panelClass}`}>
        <div className={`text-5xl font-black ${viewModel.iconClass}`}>{viewModel.icon}</div>
        <h1 className="mt-4 text-3xl font-extrabold text-gray-900">{viewModel.title}</h1>
        <p className="mt-2 text-gray-600">{viewModel.subtitle}</p>
        <p className="mt-3 text-gray-600">
          Your order number is{" "}
          <span className="font-bold text-indigo-600">{orderNo}</span>
        </p>

        <div className="mt-4 text-sm">
          <span className={`rounded-full px-3 py-1 font-semibold ${viewModel.badgeClass}`}>
            {viewModel.badgeLabel}
          </span>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={viewModel.primaryAction.to}
            className={`rounded-xl px-5 py-3 text-sm font-semibold ${
              viewModel.primaryAction.solid
                ? "bg-indigo-600 text-white hover:bg-indigo-500"
                : "border px-5 py-3 hover:bg-gray-50"
            }`}
          >
            {viewModel.primaryAction.label}
          </Link>
          <Link
            to={viewModel.secondaryAction.to}
            className="rounded-xl border px-5 py-3 text-sm font-semibold hover:bg-gray-50"
          >
            {viewModel.secondaryAction.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
