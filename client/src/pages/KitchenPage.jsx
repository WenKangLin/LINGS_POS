import { useState, useEffect } from 'react';
import { Clock, CheckCircle, Truck, RefreshCw, Trash2 } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: Clock },
  preparing: { label: 'Preparing', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: RefreshCw },
  ready: { label: 'Ready', color: 'bg-green-500/15 text-green-400 border-green-500/30', icon: CheckCircle },
  collected: { label: 'Collected', color: 'bg-stone-700 text-stone-400 border-stone-600', icon: Truck },
};

const STATUS_FLOW = ['pending', 'preparing', 'ready', 'collected'];

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');

  const fetchOrders = () => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(setOrders)
      .catch(console.error);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id, status) => {
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
  };

  const deleteOrder = async (id) => {
    await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    fetchOrders();
  };

  const nextStatus = (currentStatus) => {
    const idx = STATUS_FLOW.indexOf(currentStatus);
    return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-4xl font-bold text-white uppercase tracking-wider">Kitchen Orders</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            className="p-2 bg-stone-800 border border-stone-700 rounded hover:bg-stone-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className="text-stone-400" />
          </button>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="border border-stone-700 rounded px-3 py-2 text-sm bg-stone-800 text-white"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="collected">Collected</option>
          </select>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 text-stone-600">
          <Clock size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg text-stone-500">No orders yet</p>
          <p className="text-sm text-stone-600">Orders will appear here when customers place them</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map(order => {
            const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusCfg.icon;
            const next = nextStatus(order.status);

            return (
              <div key={order.id} className="bg-stone-800 rounded-lg border border-stone-700 overflow-hidden">
                <div className="p-4 border-b border-stone-700 bg-stone-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-stone-500 uppercase tracking-wider">Order #{order.id}</span>
                    <h3 className="font-bold text-white">{order.customerName}</h3>
                    <p className="text-xs text-stone-500">{order.phone}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded border ${statusCfg.color}`}>
                      <StatusIcon size={12} />
                      {statusCfg.label}
                    </span>
                    <p className="text-xs text-stone-600 mt-1">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded border font-bold ${
                      order.orderType === 'delivery'
                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                        : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    }`}>
                      {order.orderType === 'delivery' ? 'Delivery' : 'Collection'}
                    </span>
                  </div>

                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-stone-300">
                        <span className="font-bold text-white">{item.quantity}x</span> {item.name}
                      </span>
                      <span className="text-stone-500">€{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}

                  {order.notes && (
                    <div className="mt-2 p-2 bg-amber-500/10 rounded text-xs text-amber-400 border border-amber-500/20">
                      {order.notes}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t border-stone-700 mt-3">
                    <span className="font-bold text-amber-500 text-lg">€{order.total.toFixed(2)}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteOrder(order.id)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete order"
                      >
                        <Trash2 size={16} />
                      </button>
                      {next && (
                        <button
                          onClick={() => updateStatus(order.id, next)}
                          className="bg-amber-500 hover:bg-amber-400 text-stone-900 text-xs font-bold px-3 py-1.5 rounded transition-colors uppercase tracking-wide"
                        >
                          {STATUS_CONFIG[next].label}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
