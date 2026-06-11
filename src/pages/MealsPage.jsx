// src/pages/MealsPage.jsx
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ShoppingCart, Plus, Minus, UtensilsCrossed, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../context/AppContext';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };

export default function MealsPage() {
  const { profile, company, darkMode } = useApp();
  const [activeTab, setActiveTab] = useState('breakfast');
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState({});
  const [orders, setOrders] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile && company) {
      loadData();
    }
  }, [profile, company]);

  async function loadData() {
    if (!profile || !company) return;
    const [menuRes, ordersRes] = await Promise.all([
      supabase
        .from('meal_menu')
        .select('*')
        .eq('company_id', company.id)
        .eq('is_available', true)
        .order('category'),

      supabase
        .from('meal_orders')
        .select('*')
        .eq('company_id', company.id)
        .eq('employee_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    setMenu(menuRes.data || []);
    setOrders(ordersRes.data || []);
    setLoading(false);
  }

  function filteredMenu() {
    return menu.filter(item => item.category === activeTab || item.category === 'all');
  }

  function addToCart(item) {
    setCart(prev => ({ ...prev, [item.id]: { ...item, qty: (prev[item.id]?.qty || 0) + 1 } }));
  }

  function removeFromCart(itemId) {
    setCart(prev => {
      const next = { ...prev };
      if (next[itemId]?.qty > 1) next[itemId] = { ...next[itemId], qty: next[itemId].qty - 1 };
      else delete next[itemId];
      return next;
    });
  }

  function clearCart() { setCart({}); }

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);

  async function placeOrder() {
    if (cartItems.length === 0 || !company) return;
    setOrdering(true);

    const today = format(new Date(), 'yyyy-MM-dd');
    const { error } = await supabase.from('meal_orders').insert({
      company_id: company.id,
      employee_id: profile.id,
      meal_type: activeTab,
      items: cartItems.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
      total_price: cartTotal,
      order_date: today,
      special_notes: notes,
    });

    if (!error) {
      setCart({});
      setNotes('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      loadData();
    }
    setOrdering(false);
  }

  const card = `rounded-2xl p-5 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`;
  const statusBadge = s => ({
    ordered: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    preparing: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    ready: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    delivered: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  }[s] || '');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meal Orders</h1>
        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Order breakfast, lunch, or dinner</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-800">
          <Check size={18} />
          Order placed successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu */}
        <div className="lg:col-span-2 space-y-4">
          {/* Meal type tabs */}
          <div className={`flex gap-1 p-1 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            {MEAL_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition flex items-center justify-center gap-1.5
                  ${activeTab === type ? 'bg-red-600 text-white shadow' : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <span>{MEAL_ICONS[type]}</span>
                {type}
              </button>
            ))}
          </div>

          {/* Menu items */}
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredMenu().map(item => {
                const qty = cart[item.id]?.qty || 0;
                return (
                  <div key={item.id} className={`${card} p-4`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">{item.name}</h3>
                        <p className={`text-xs mt-0.5 line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.description}</p>
                        <p className="text-red-500 font-bold text-sm mt-2">${item.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {qty > 0 ? (
                          <>
                            <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center">
                              <Minus size={14} />
                            </button>
                            <span className="w-5 text-center text-sm font-bold">{qty}</span>
                            <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center">
                              <Plus size={14} />
                            </button>
                          </>
                        ) : (
                          <button onClick={() => addToCart(item)} className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center">
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredMenu().length === 0 && (
                <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'} col-span-2`}>
                  No {activeTab} items available today
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart + recent orders */}
        <div className="space-y-4">
          {/* Cart */}
          <div className={card}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <ShoppingCart size={18} className="text-red-500" />
                Cart
                {cartCount > 0 && (
                  <span className="w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">{cartCount}</span>
                )}
              </h2>
              {cartCount > 0 && (
                <button onClick={clearCart} className={`text-xs ${darkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>Clear</button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className={`text-center py-6 text-sm ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                <UtensilsCrossed size={28} className="mx-auto mb-2 opacity-30" />
                Add items from the menu
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="flex-1 truncate">{item.name}</span>
                      <span className={`mx-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>×{item.qty}</span>
                      <span className="font-medium">${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className={`flex items-center justify-between pt-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-red-500">${cartTotal.toFixed(2)}</span>
                </div>

                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Special notes (allergies, etc.)…"
                  rows={2}
                  className={`w-full mt-3 px-3 py-2 text-xs rounded-xl border resize-none focus:outline-none focus:ring-2 focus:ring-red-500
                    ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 placeholder-gray-400'}`}
                />

                <button
                  onClick={placeOrder}
                  disabled={ordering}
                  className="w-full mt-3 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition shadow-lg shadow-red-500/20"
                >
                  {ordering ? 'Placing Order…' : `Place Order • $${cartTotal.toFixed(2)}`}
                </button>
              </>
            )}
          </div>

          {/* Recent orders */}
          <div className={card}>
            <h2 className="font-semibold mb-4">Recent Orders</h2>
            {orders.length === 0 ? (
              <div className={`text-center py-4 text-sm ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>No orders yet</div>
            ) : (
              <div className="space-y-2">
                {orders.slice(0, 5).map(o => (
                  <div key={o.id} className={`p-3 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium capitalize">{o.meal_type}</span>
                        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{o.order_date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-500">${o.total_price}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${statusBadge(o.status)}`}>{o.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
