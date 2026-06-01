import { useState, useEffect } from 'react';
import { BarChart3, Calendar, ArrowLeft, ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AnalyticsPage() {
  const [view, setView] = useState('daily');
  const [dailySummary, setDailySummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [monthlyData, setMonthlyData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthDetail, setMonthDetail] = useState(null);

  // Item Tracker state
  const [trackerPeriod, setTrackerPeriod] = useState('week');
  const [trackerOffset, setTrackerOffset] = useState(0);
  const [trackerData, setTrackerData] = useState(null);

  useEffect(() => {
    if (view === 'daily') {
      fetch(`/api/summary/daily?date=${selectedDate}`)
        .then(r => r.json()).then(setDailySummary).catch(console.error);
    }
  }, [view, selectedDate]);

  useEffect(() => {
    if (view === 'monthly' && !selectedMonth) {
      fetch(`/api/analytics/monthly?year=${selectedYear}`)
        .then(r => r.json()).then(setMonthlyData).catch(console.error);
    }
  }, [view, selectedYear, selectedMonth]);

  useEffect(() => {
    if (view === 'monthly' && selectedMonth) {
      fetch(`/api/analytics/monthly?year=${selectedYear}&month=${selectedMonth}`)
        .then(r => r.json()).then(setMonthDetail).catch(console.error);
    }
  }, [view, selectedYear, selectedMonth]);

  useEffect(() => {
    if (view === 'item') {
      fetch(`/api/analytics/item-tracker?period=${trackerPeriod}&offset=${trackerOffset}`)
        .then(r => r.json()).then(setTrackerData).catch(console.error);
    }
  }, [view, trackerPeriod, trackerOffset]);


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-white uppercase tracking-wider mb-8">Analytics</h1>

      {/* View tabs */}
      <div className="flex gap-2 mb-8">
        {[
          { id: 'daily', label: 'Daily Summary' },
          { id: 'monthly', label: 'Monthly Breakdown' },
          { id: 'item', label: 'Item Tracker' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setView(tab.id); setSelectedMonth(null); setMonthDetail(null); }}
            className={`px-4 py-2 rounded font-bold uppercase tracking-wide text-xs transition-colors ${
              view === tab.id ? 'bg-amber-500 text-stone-900' : 'bg-stone-800 text-white border border-stone-700 hover:bg-stone-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== DAILY SUMMARY ===== */}
      {view === 'daily' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Calendar size={18} className="text-amber-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-stone-800 border border-stone-700 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {dailySummary && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-stone-800 border border-stone-700 rounded-lg p-5">
                  <p className="text-stone-500 text-xs uppercase tracking-wider font-bold mb-1">Total Orders</p>
                  <p className="text-3xl font-bold text-white">{dailySummary.totalOrders}</p>
                </div>
                <div className="bg-stone-800 border border-stone-700 rounded-lg p-5">
                  <p className="text-stone-500 text-xs uppercase tracking-wider font-bold mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-amber-500">€{dailySummary.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-stone-800 border border-stone-700 rounded-lg p-5">
                  <p className="text-stone-500 text-xs uppercase tracking-wider font-bold mb-1">Status Breakdown</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(dailySummary.byStatus || {}).map(([status, count]) => (
                      <span key={status} className="text-xs px-2 py-0.5 rounded bg-stone-700 text-stone-300 font-bold">
                        {status}: {count}
                      </span>
                    ))}
                    {Object.keys(dailySummary.byStatus || {}).length === 0 && (
                      <span className="text-xs text-stone-600">No orders</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Items sold */}
              {dailySummary.topItems.length > 0 && (
                <div className="bg-stone-800 border border-stone-700 rounded-lg overflow-hidden">
                  <div className="px-5 py-3 border-b border-stone-700">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 size={16} className="text-amber-500" /> Items Sold Today
                    </h3>
                  </div>
                  <div className="divide-y divide-stone-700">
                    {dailySummary.topItems.map((item, i) => (
                      <div key={i} className="px-5 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-stone-600 text-xs font-bold w-6">#{i + 1}</span>
                          <span className="text-white text-sm font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-stone-400 text-sm">{item.quantity} sold</span>
                          <span className="text-amber-500 font-bold text-sm">€{item.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== MONTHLY BREAKDOWN ===== */}
      {view === 'monthly' && !selectedMonth && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setSelectedYear(y => y - 1)} className="p-1.5 rounded bg-stone-800 border border-stone-700 text-stone-400 hover:text-white hover:bg-stone-700">
              <ArrowLeft size={16} />
            </button>
            <span className="text-white font-bold text-lg">{selectedYear}</span>
            <button onClick={() => setSelectedYear(y => y + 1)} className="p-1.5 rounded bg-stone-800 border border-stone-700 text-stone-400 hover:text-white hover:bg-stone-700">
              <ArrowRight size={16} />
            </button>
          </div>

          {monthlyData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {monthlyData.months.map(m => (
                <button
                  key={m.month}
                  onClick={() => setSelectedMonth(m.month)}
                  className="bg-stone-800 border border-stone-700 rounded-lg p-4 text-left hover:border-stone-600 transition-all group"
                >
                  <p className="text-amber-500 text-xs uppercase tracking-wider font-bold mb-2">{m.monthName}</p>
                  <p className="text-2xl font-bold text-white">{m.totalOrders} <span className="text-sm text-stone-500 font-normal">orders</span></p>
                  <p className="text-amber-500 font-bold mt-1">€{m.totalRevenue.toFixed(2)}</p>
                  {m.items.length > 0 && (
                    <p className="text-stone-500 text-xs mt-2 group-hover:text-stone-400">Top: {m.items[0].name} ({m.items[0].quantity})</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== MONTH DETAIL ===== */}
      {view === 'monthly' && selectedMonth && monthDetail && (
        <div>
          <button onClick={() => { setSelectedMonth(null); setMonthDetail(null); }} className="text-sm text-amber-500 hover:underline mb-4 flex items-center gap-1">
            <ArrowLeft size={14} /> Back to {selectedYear} overview
          </button>

          <h2 className="text-2xl font-bold text-white mb-2">{monthDetail.monthName} {selectedYear}</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-stone-800 border border-stone-700 rounded-lg p-4">
              <p className="text-stone-500 text-xs uppercase tracking-wider font-bold mb-1">Orders</p>
              <p className="text-2xl font-bold text-white">{monthDetail.totalOrders}</p>
            </div>
            <div className="bg-stone-800 border border-stone-700 rounded-lg p-4">
              <p className="text-stone-500 text-xs uppercase tracking-wider font-bold mb-1">Revenue</p>
              <p className="text-2xl font-bold text-amber-500">€{monthDetail.totalRevenue.toFixed(2)}</p>
            </div>
          </div>

          {monthDetail.items.length > 0 ? (
            <div className="bg-stone-800 border border-stone-700 rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-stone-700">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">All Items Sold</h3>
              </div>
              <div className="divide-y divide-stone-700">
                {monthDetail.items.map((item, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-stone-600 text-xs font-bold w-6">#{i + 1}</span>
                      <span className="text-white text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-stone-400 text-sm">{item.quantity} sold</span>
                      <span className="text-amber-500 font-bold text-sm">€{item.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-stone-600 text-center py-8">No orders this month</p>
          )}
        </div>
      )}

      {/* ===== ITEM TRACKER ===== */}
      {view === 'item' && (
        <div>
          {/* Period toggle */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex rounded overflow-hidden border border-stone-700">
              {['week', 'month', 'year'].map(p => (
                <button
                  key={p}
                  onClick={() => { setTrackerPeriod(p); setTrackerOffset(0); }}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                    trackerPeriod === p ? 'bg-amber-500 text-stone-900' : 'bg-stone-800 text-white hover:bg-stone-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Offset navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTrackerOffset(o => o + 1)}
                className="p-1.5 rounded bg-stone-800 border border-stone-700 text-stone-400 hover:text-white hover:bg-stone-700"
                title={`Go further back`}
              >
                <ArrowLeft size={16} />
              </button>
              <span className="text-white text-sm font-medium min-w-[60px] text-center">
                {trackerOffset === 0 ? 'Current' : `−${trackerOffset}`}
              </span>
              <button
                onClick={() => setTrackerOffset(o => Math.max(0, o - 1))}
                disabled={trackerOffset === 0}
                className="p-1.5 rounded bg-stone-800 border border-stone-700 text-stone-400 hover:text-white hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Go forward"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Period label */}
          {trackerData && (
            <div className="mb-6">
              <p className="text-white font-bold text-lg">{trackerData.label}</p>
              <p className="text-stone-500 text-xs">Compared to: {trackerData.previousLabel}</p>
            </div>
          )}

          {/* Items grid */}
          {trackerData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {trackerData.items.map((item) => {
                const diff = item.count - item.previousCount;
                const showArrow = item.count > 0 || item.previousCount > 0;
                return (
                  <div key={item.name} className="bg-stone-800 border border-stone-700 rounded-lg p-4 flex flex-col gap-2">
                    <p className="text-white text-sm font-medium leading-tight truncate" title={item.name}>{item.name}</p>
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-bold text-amber-500">{item.count}</span>
                      {showArrow && (
                        <span className={`flex items-center gap-0.5 text-xs font-bold ${
                          diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-stone-500'
                        }`}>
                          {diff > 0 && <ArrowUpRight size={14} />}
                          {diff < 0 && <ArrowDownRight size={14} />}
                          {diff !== 0 && <span>{diff > 0 ? '+' : ''}{diff}</span>}
                          {diff === 0 && <span>—</span>}
                        </span>
                      )}
                    </div>
                    <p className="text-stone-600 text-[10px] uppercase tracking-wider font-bold">orders this {trackerPeriod}</p>
                  </div>
                );
              })}
            </div>
          )}

          {!trackerData && (
            <div className="text-center py-12 text-stone-600">
              <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">Loading item tracker...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
