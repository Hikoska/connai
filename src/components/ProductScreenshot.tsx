export const ProductScreenshot = () => (
  <section className="py-20 bg-white">
    <div className="max-w-4xl mx-auto px-4 text-center">
      <h2 className="text-4xl font-bold font-serif mb-4">Your dashboard, ready after your audit</h2>
      <p className="text-gray-500 mb-8">All your insights, benchmarks, and action items in one place.</p>
      <div className="bg-gray-800 rounded-t-lg p-2 flex items-center">
        <div className="flex space-x-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
      </div>
      <div className="bg-gray-200 h-96 w-full flex items-center justify-center border-x border-b border-gray-800 rounded-b-lg">
        <p className="text-gray-500">[Product Screenshot Placeholder]</p>
      </div>
    </div>
  </section>
)
