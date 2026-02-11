import React from "react";
import { Link, useParams } from "react-router-dom";

export default function OrderSuccess() {
  const { orderNo } = useParams();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="bg-white border rounded-2xl p-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Order placed ✅</h1>
        <p className="mt-2 text-gray-600">
          Your order number is{" "}
          <span className="font-bold text-indigo-600">{orderNo}</span>
        </p>

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
