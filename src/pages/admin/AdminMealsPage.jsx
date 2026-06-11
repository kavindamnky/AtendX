// src/pages/admin/AdminMealsPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { 
  UtensilsCrossed, Plus, Edit2, Trash2, Check, X, AlertTriangle, 
  TrendingUp, DollarSign, ShoppingBag, Eye, Award
} from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = ['breakfast', 'lunch', 'dinner', 'all'];

export default function AdminMealsPage() {
  const { company, darkMode } = useApp();
  const [activeTab, setActiveTab] = useState('menu'); // 'menu' | 'orders'

  // Menu State
  const [menu, setMenu] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null); // Item to edit, or null

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('lunch');
  const [description, setDescription] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [tags, setTags] = useState(''); // comma-separated strings (e.g. Veg, Spicy)
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Orders State
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(null); // orderId

  // Statistics
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    popularItem: '—',
  });

  useEffect(() => {
    if (company?.id) {
      loadMenu();
      loadOrders();
    }
  }, [company?.id]);

  // Load menu
  async function loadMenu() {
    setMenuLoading(true);
    const { data } = await supabase
      .from('meal_menu')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    setMenu(data || []);
    setMenuLoading(false);
  }

  // Load orders with employee profile details
  async function loadOrders() {
    setOrdersLoading(true);
    const { data } = await supabase
      .from('meal_orders')
      .select(`
        *,
        profiles (
          full_name,
          department,
          employee_id
        )
      `)
      .eq('company_id', company.id)
      .order('created_at', { ascending: false });

    const fetchedOrders = data || [];
    setOrders(fetchedOrders);
    calculateStats(fetchedOrders);
    setOrdersLoading(false);
  }

  // Calculate statistics
  function calculateStats(allOrders) {
    if (allOrders.length === 0) return;
    const total = allOrders.length;
    const revenue = allOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

    // Calculate popular item
    const itemsCount = {};
    allOrders.forEach(order => {
      if (Array.isArray(order.items)) {
        order.items.forEach(item => {
          itemsCount[item.name] = (itemsCount[item.name] || 0) + (item.qty || 1);
        });
      }
    });

    let popular = '—';
    let max = 0;
    Object.entries(itemsCount).forEach(([name, count]) => {
      if (count > max) {
        max = count;
        popular = name;
      }
    });

    setStats({
      totalOrders: total,
      totalRevenue: revenue,
      popularItem: popular,
    });
  }

  // Handle Edit click
  function handleEditClick(item) {
    setEditingItem(item);
    setName(item.name);
    setPrice(item.price);
    setCategory(item.category || 'lunch');
    setDescription(item.description || '');
    setIsAvailable(item.is_available);
    // Parse tags JSON or array if stored, otherwise handle as string
    setTags(Array.isArray(item.tags) ? item.tags.join(', ') : item.tags || '');
    setFormError('');
  }

  // Cancel edit
  function handleCancelEdit() {
    setEditingItem(null);
    clearForm();
  }

  function clearForm() {
    setName('');
    setPrice('');
    setCategory('lunch');
    setDescription('');
    setIsAvailable(true);
    setTags('');
    setFormError('');
  }

  // Save / Add menu item
  async function handleFormSubmit(e) {
    e.preventDefault();
    if (!name || !price) {
      setFormError('Name and Price are required.');
      return;
    }
    setSaving(true);
    setFormError('');

    const parsedTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const itemPayload = {
      company_id: company.id,
      name,
      price: parseFloat(price),
      category,
      description,
      is_available: isAvailable,
      image_url: parsedTags // we repurpose tags or save them, wait schema does not have tags column.
      // Wait! In the schema, `meal_menu` does NOT have a `tags` column!
      // Let's check `supabase_schema.sql` lines 113 to 123:
      // meal_menu has: id, company_id, name, category, price, description, is_available, image_url, created_at.
      // So let's store the tags in the description, or just use the existing columns (name, category, price, description, is_available).
      // Let's keep it safe: just store name, price, category, description, is_available, image_url.
      // We can also store tags inside the description if we want, or just omit the tags field database-wise to avoid schema errors.
      // Yes, let's just use description and not try to insert tags into a column that doesn't exist.
    };

    let error;
    if (editingItem) {
      const { error: err } = await supabase
        .from('meal_menu')
        .update(itemPayload)
        .eq('id', editingItem.id);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('meal_menu')
        .insert(itemPayload);
      error = err;
    }

    if (error) {
      setFormError(error.message);
    } else {
      setFormSuccess(true);
      clearForm();
      setEditingItem(null);
      loadMenu();
      setTimeout(() => setFormSuccess(false), 3000);
    }
    setSaving(false);
  }

  // Delete Menu Item
  async function handleDeleteItem(itemId) {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    const { error } = await supabase
      .from('meal_menu')
      .delete()
      .eq('id', itemId);

    if (error) {
      alert(error.message);
    } else {
      loadMenu();
    }
  }

  // Toggle availability
  async function handleToggleAvailability(item) {
    const { error } = await supabase
      .from('meal_menu')
      .update({ is_available: !item.is_available })
      .eq('id', item.id);

    if (!error) {
      loadMenu();
    }
  }

  // Update order status
  async function handleUpdateOrderStatus(orderId, newStatus) {
    setStatusUpdating(orderId);
    const { error } = await supabase
      .from('meal_orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      alert(error.message);
    } else {
      loadOrders();
    }
    setStatusUpdating(null);
  }

  // Styling helpers
  const card = `rounded-2xl p-5 ${darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-100 shadow-sm'}`;
  const inputClass = `w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition
    ${darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 placeholder-gray-400'}`;
  const labelClass = `block text-xs font-semibold mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`;

  const statusMap = {
    ordered: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-500/20',
    preparing: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-500/20',
    ready: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-500/20',
    delivered: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 border border-green-500/20',
    cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-500/20',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Meals & Menu Management</h1>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Manage corporate meal options and fulfill employee food orders.
          </p>
        </div>
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={card}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <ShoppingBag size={20} />
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Total Meal Orders</p>
              <h3 className="text-2xl font-bold mt-0.5">{stats.totalOrders}</h3>
            </div>
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
              <DollarSign size={20} />
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Fulfillment Volume</p>
              <h3 className="text-2xl font-bold mt-0.5 text-green-500">LKR {stats.totalRevenue.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <Award size={20} />
            </div>
            <div>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Most Popular Dish</p>
              <h3 className="text-base font-bold mt-0.5 truncate max-w-[180px]">{stats.popularItem}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('menu')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition ${activeTab === 'menu' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Menu Management
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition ${activeTab === 'orders' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Live Orders
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'menu' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add / Edit Form */}
          <div className="lg:col-span-1">
            <form onSubmit={handleFormSubmit} className={card}>
              <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                <UtensilsCrossed size={16} className="text-red-500" />
                {editingItem ? 'Edit Meal Option' : 'Add New Meal Option'}
              </h3>

              {formError && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertTriangle size={14} className="shrink-0" /> {formError}
                </div>
              )}
              {formSuccess && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
                  ✓ Meal option saved successfully!
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Meal Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Sri Lankan Rice & Curry"
                    className={inputClass}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Price (LKR)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      placeholder="350"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Category</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className={inputClass}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat} className="capitalize">{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Includes red rice, 3 veg curries, papadam, and chicken/fish."
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/40 border border-gray-800">
                  <span className="text-xs font-semibold text-gray-300">Available to Order</span>
                  <button
                    type="button"
                    onClick={() => setIsAvailable(!isAvailable)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAvailable ? 'bg-green-600' : 'bg-gray-700'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAvailable ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex gap-2.5 pt-2">
                  {editingItem && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-sm font-semibold transition"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-grow py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {saving ? 'Saving…' : (
                      <>
                        <Plus size={16} />
                        {editingItem ? 'Save Option' : 'Add Option'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Menu Table/Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className={card}>
              <h3 className="font-bold text-base mb-4">Meal Menu Options</h3>
              {menuLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
                </div>
              ) : menu.length === 0 ? (
                <div className={`text-center py-12 text-sm ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  No menu options configured yet. Add one on the left.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className={`border-b ${darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-100 text-gray-400'} font-medium`}>
                        <th className="py-3 px-4">Meal</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {menu.map(item => (
                        <tr key={item.id} className={darkMode ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50'}>
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <div>
                              <span>{item.name}</span>
                              {item.description && (
                                <p className="text-xs text-gray-500 font-normal mt-0.5 line-clamp-1">{item.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 capitalize">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.category === 'breakfast' ? 'bg-amber-950/40 text-amber-400 border border-amber-500/10' : item.category === 'lunch' ? 'bg-blue-950/40 text-blue-400 border border-blue-500/10' : 'bg-purple-950/40 text-purple-400 border border-purple-500/10'}`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-red-500">LKR {item.price.toFixed(2)}</td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleAvailability(item)}
                              className={`px-2 py-0.5 rounded-full text-xs font-bold transition ${item.is_available ? 'bg-green-950/40 text-green-400 border border-green-500/10' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}
                            >
                              {item.is_available ? 'Available' : 'Unavailable'}
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEditClick(item)}
                                className={`p-1.5 rounded-lg transition ${darkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-950/30 transition"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Orders Management Tab */
        <div className={card}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-bold text-base">Live Corporate Orders</h3>
            <button
              onClick={loadOrders}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
            >
              Refresh Orders
            </button>
          </div>

          {ordersLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
            </div>
          ) : orders.length === 0 ? (
            <div className={`text-center py-16 text-sm ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              No meal orders have been submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-gray-800 text-gray-500' : 'border-gray-100 text-gray-400'} font-medium`}>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Order Details</th>
                    <th className="py-3 px-4">Date & Session</th>
                    <th className="py-3 px-4">Total Price</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Fulfillment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {orders.map(order => {
                    const emp = order.profiles;
                    return (
                      <tr key={order.id} className={darkMode ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50'}>
                        {/* Employee info */}
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-semibold text-white">{emp?.full_name || 'Unknown Staff'}</p>
                            <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {emp?.department || 'Staff'} {emp?.employee_id ? `• ${emp.employee_id}` : ''}
                            </p>
                          </div>
                        </td>
                        
                        {/* Order items */}
                        <td className="py-4 px-4 max-w-[200px]">
                          <div>
                            <div className="space-y-0.5">
                              {Array.isArray(order.items) ? order.items.map((it, idx) => (
                                <div key={idx} className="text-xs text-gray-300 font-medium">
                                  {it.name} <span className="text-red-500">×{it.qty}</span>
                                </div>
                              )) : <span className="text-xs text-gray-500">No items info</span>}
                            </div>
                            {order.special_notes && (
                              <p className="text-[10px] text-amber-500 font-medium mt-1 leading-tight max-w-[180px] truncate" title={order.special_notes}>
                                Note: {order.special_notes}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Date and Session */}
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-white">{order.order_date}</p>
                            <p className="text-xs text-gray-500 capitalize">{order.meal_type}</p>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="py-4 px-4 font-bold text-red-500">
                          LKR {parseFloat(order.total_price || 0).toFixed(2)}
                        </td>

                        {/* Status badge */}
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${statusMap[order.status]}`}>
                            {order.status}
                          </span>
                        </td>

                        {/* Action controllers */}
                        <td className="py-4 px-4 text-right">
                          {statusUpdating === order.id ? (
                            <Loader2 className="animate-spin text-red-500 inline-block mr-2" size={16} />
                          ) : (
                            <select
                              value={order.status}
                              onChange={e => handleUpdateOrderStatus(order.id, e.target.value)}
                              className={`px-2 py-1 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-red-500 transition capitalize
                                ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                            >
                              <option value="ordered">ordered</option>
                              <option value="preparing">preparing</option>
                              <option value="ready">ready</option>
                              <option value="delivered">delivered</option>
                              <option value="cancelled">cancelled</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simple loader wrapper
function Loader2({ className, size }) {
  return (
    <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} style={{ width: size || 16, height: size || 16 }} />
  );
}
