import React from "react";

const Analytics = () => {
  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-10 py-10">

      <h1 className="text-3xl font-semibold tracking-tight">
        Analytics
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <p className="text-gray-500 text-sm">Total Users</p>
          <h2 className="text-2xl font-semibold">12,431</h2>
        </div>

        <div className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <p className="text-gray-500 text-sm">Quiz Attempts</p>
          <h2 className="text-2xl font-semibold">4,210</h2>
        </div>

        <div className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm">
          <p className="text-gray-500 text-sm">Completion Rate</p>
          <h2 className="text-2xl font-semibold">78%</h2>
        </div>

      </div>

      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm"
        >
          <h3 className="text-lg font-semibold mb-2">
            Analytics Chart {i + 1}
          </h3>

          <div className="h-40 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
            Chart Placeholder
          </div>
        </div>
      ))}

    </div>
  );
};

export default Analytics;