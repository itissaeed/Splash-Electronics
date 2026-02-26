import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "../../utils/api";

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
        const status = data?.payment?.status || statusParam || "unpaid";
        setPaymentStatus(status);
      } catch (e) {
        setPaymentStatus(statusParam || "pending");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orderNo, location.search]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="bg-white border rounded-2xl p-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Order placed ✅</h1>
        <p className="mt-2 text-gray-600">
          Your order number is{" "}
          <span className="font-bold text-indigo-600">{orderNo}</span>
        </p>

        <div className="mt-4 text-sm">
          {loading ? (
            <span className="text-gray-500">Checking payment status...</span>
          ) : paymentStatus === "paid" || paymentStatus === "success" ? (
            <span className="rounded-full bg-green-50 px-3 py-1 font-semibold text-green-700">
              Payment confirmed
            </span>
          ) : paymentStatus === "failed" || paymentStatus === "cancelled" ? (
            <span className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700">
              Payment not completed
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700">
              Payment pending
            </span>
          )}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={`/order/${orderNo}`}
            className="rounded-xl bg-indigo-600 text-white px-5 py-3 text-sm font-semibold hover:bg-indigo-500"
          >
            View Order Details
          </Link>
          <Link
            to="/"
            className="rounded-xl border px-5 py-3 text-sm font-semibold hover:bg-gray-50"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
