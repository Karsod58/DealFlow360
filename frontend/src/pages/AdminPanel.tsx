import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Generic API helper
const apiClient = {
  get: async (url: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },
  post: async (url: string, data: any) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api${url}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },
  put: async (url: string, data: any) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api${url}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },
  delete: async (url: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api${url}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },
};

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  category: string;
  unit_price: number;
  discount_limit: number;
  in_stock: number;
}

interface Warehouse {
  id: number;
  name: string;
  warehouse_code: string;
  location: string;
  shipping_cost_base: number;
}

interface DiscountCeiling {
  id?: number;
  tier?: string;
  category?: string;
  max_discount: number;
}

type TabType = 'users' | 'products' | 'warehouses' | 'config';

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('users');
  
  // State for users
  const [users, setUsers] = useState<User[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // State for products
  const [products, setProducts] = useState<Product[]>([]);
  
  // State for warehouses
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  
  // State for discount ceilings
  const [discountCeilings, setDiscountCeilings] = useState<DiscountCeiling[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if user is ADMIN
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Load data based on active tab
  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const loadTabData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      switch (activeTab) {
        case 'users':
          await loadUsers();
          break;
        case 'products':
          await loadProducts();
          break;
        case 'warehouses':
          await loadWarehouses();
          break;
        case 'config':
          await loadDiscountCeilings();
          break;
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const response = await apiClient.get('/admin/users');
    setUsers(response);
  };

  const loadProducts = async () => {
    const response = await apiClient.get('/products');
    setProducts(response);
  };

  const loadWarehouses = async () => {
    const response = await apiClient.get('/warehouses');
    setWarehouses(response);
  };

  const loadDiscountCeilings = async () => {
    const response = await apiClient.get('/admin/discount-ceilings');
    setDiscountCeilings(response);
  };

  const handleCreateUser = async (formData: any) => {
    try {
      await apiClient.post('/admin/users', formData);
      setSuccessMessage('User created successfully');
      setShowUserForm(false);
      await loadUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (userId: number, formData: any) => {
    try {
      await apiClient.put(`/admin/users/${userId}`, formData);
      setSuccessMessage('User updated successfully');
      setEditingUser(null);
      await loadUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await apiClient.delete(`/admin/users/${userId}`);
      setSuccessMessage('User deleted successfully');
      await loadUsers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleSaveDiscountCeilings = async () => {
    try {
      await apiClient.post('/admin/save-configuration', discountCeilings);
      setSuccessMessage('Discount ceilings saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save configuration');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-1">Manage system configuration and users</p>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'products'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Products
              </button>
              <button
                onClick={() => setActiveTab('warehouses')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'warehouses'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Warehouses
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'config'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Configuration
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Loading...</p>
              </div>
            ) : (
              <>
                {activeTab === 'users' && (
                  <UsersTab
                    users={users}
                    showUserForm={showUserForm}
                    setShowUserForm={setShowUserForm}
                    editingUser={editingUser}
                    setEditingUser={setEditingUser}
                    onCreateUser={handleCreateUser}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={handleDeleteUser}
                  />
                )}

                {activeTab === 'products' && (
                  <ProductsTab products={products} />
                )}

                {activeTab === 'warehouses' && (
                  <WarehousesTab warehouses={warehouses} />
                )}

                {activeTab === 'config' && (
                  <ConfigTab
                    discountCeilings={discountCeilings}
                    setDiscountCeilings={setDiscountCeilings}
                    onSave={handleSaveDiscountCeilings}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Users Tab Component
interface UsersTabProps {
  users: User[];
  showUserForm: boolean;
  setShowUserForm: (show: boolean) => void;
  editingUser: User | null;
  setEditingUser: (user: User | null) => void;
  onCreateUser: (data: any) => void;
  onUpdateUser: (userId: number, data: any) => void;
  onDeleteUser: (userId: number) => void;
}

const UsersTab: React.FC<UsersTabProps> = ({
  users,
  showUserForm,
  setShowUserForm,
  editingUser,
  setEditingUser,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'REP',
    password: '',
  });

  useEffect(() => {
    if (editingUser) {
      setFormData({
        email: editingUser.email,
        name: editingUser.name,
        role: editingUser.role,
        password: '',
      });
    }
  }, [editingUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      onUpdateUser(editingUser.id, formData);
    } else {
      onCreateUser(formData);
    }
    setFormData({ email: '', name: '', role: 'REP', password: '' });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">User Management</h2>
        <button
          onClick={() => setShowUserForm(!showUserForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showUserForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {/* User Form */}
      {(showUserForm || editingUser) && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">{editingUser ? 'Edit User' : 'Create New User'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="REP">Sales Rep</option>
                <option value="MANAGER">Manager</option>
                <option value="FINANCE">Finance</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {editingUser && '(leave blank to keep current)'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required={!editingUser}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingUser ? 'Update User' : 'Create User'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUserForm(false);
                setEditingUser(null);
                setFormData({ email: '', name: '', role: 'REP', password: '' });
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'MANAGER' ? 'bg-blue-100 text-blue-800' :
                    user.role === 'FINANCE' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => setEditingUser(user)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteUser(user.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Products Tab Component
const ProductsTab: React.FC<{ products: Product[] }> = ({ products }) => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Product Management</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount Limit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${product.unit_price.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.discount_limit}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.in_stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Warehouses Tab Component
const WarehousesTab: React.FC<{ warehouses: Warehouse[] }> = ({ warehouses }) => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Warehouse Management</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shipping Cost</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {warehouses.map((warehouse) => (
              <tr key={warehouse.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{warehouse.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{warehouse.warehouse_code}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{warehouse.location}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${warehouse.shipping_cost_base.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Configuration Tab Component
interface ConfigTabProps {
  discountCeilings: DiscountCeiling[];
  setDiscountCeilings: (ceilings: DiscountCeiling[]) => void;
  onSave: () => void;
}

const ConfigTab: React.FC<ConfigTabProps> = ({ discountCeilings, setDiscountCeilings, onSave }) => {
  const addCeiling = () => {
    setDiscountCeilings([...discountCeilings, { tier: '', category: '', max_discount: 0 }]);
  };

  const updateCeiling = (index: number, field: string, value: any) => {
    const updated = [...discountCeilings];
    updated[index] = { ...updated[index], [field]: value };
    setDiscountCeilings(updated);
  };

  const removeCeiling = (index: number) => {
    setDiscountCeilings(discountCeilings.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Discount Ceiling Configuration</h2>
        <div className="flex gap-2">
          <button
            onClick={addCeiling}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Add Ceiling
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Configuration
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {discountCeilings.map((ceiling, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                <input
                  type="text"
                  value={ceiling.tier || ''}
                  onChange={(e) => updateCeiling(index, 'tier', e.target.value)}
                  placeholder="Bronze, Silver, Gold"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text"
                  value={ceiling.category || ''}
                  onChange={(e) => updateCeiling(index, 'category', e.target.value)}
                  placeholder="Hardware, Services"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (%)</label>
                <input
                  type="number"
                  value={ceiling.max_discount}
                  onChange={(e) => updateCeiling(index, 'max_discount', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => removeCeiling(index)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {discountCeilings.length === 0 && (
        <p className="text-center text-gray-500 py-8">No discount ceilings configured. Click "Add Ceiling" to create one.</p>
      )}
    </div>
  );
};

export default AdminPanel;
