// Placeholder for a simple list of past audits.
// This will be implemented fully in a later phase.
export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Your Audits</h1>
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <p className="text-gray-500">Your past audit reports will appear here.</p>
        {/* Example of a past audit item */}
        <div className="mt-4 p-4 border rounded-md bg-gray-50">
          <h2 className="font-semibold">Q4 2025 Digital Maturity Report</h2>
          <p className="text-sm text-gray-500">Completed: 2025-12-15</p>
          <a href="#" className="text-teal-500 text-sm font-medium mt-2 inline-block">View Report →</a>
        </div>
      </div>
    </div>
  )
}
