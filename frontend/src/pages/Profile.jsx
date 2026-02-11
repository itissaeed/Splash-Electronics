import React, { useContext } from "react";
import { UserContext } from "./context/UserContext";

export default function Profile() {
  const { user } = useContext(UserContext);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-extrabold mb-4">My Profile</h1>

        <div className="space-y-3 text-sm">
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Phone:</strong> {user.number}</p>
          <p>
            <strong>Role:</strong>{" "}
            {user.isAdmin ? "Admin" : "Customer"}
          </p>
        </div>
      </div>
    </div>
  );
}
