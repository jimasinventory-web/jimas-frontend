import React, { useState, useEffect } from 'react';
import './App.css';

// =============================================================================
// API BASE URL - YOUR RENDER BACKEND
// =============================================================================
const API_BASE = "https://jimas-backend-api.onrender.com";

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================
function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (token) {
      try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(atob(payload));
        setUser(decoded);
      } catch (e) {
        console.error('Invalid token');
        handleLogout();
      }
    }
  }, [token]);

  const handleLogin = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
  };

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Navbar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard token={token} user={user} setActiveTab={setActiveTab} />}
        {activeTab === 'inventory' && <Inventory token={token} user={user} />}
        {activeTab === 'sales' && <Sales token={token} user={user} />}
        {activeTab === 'credit-customers' && <CreditCustomers token={token} user={user} />}
        {activeTab === 'bulk-resellers' && <BulkResellers token={token} user={user} />}
        {activeTab === 'reports' && <Reports token={token} user={user} />}
        {activeTab === 'supplier-reports' && <SupplierReports token={token} user={user} />}
        {activeTab === 'settings' && <Settings token={token} user={user} />}
      </main>
    </div>
  );
}

// =============================================================================
// NAVBAR COMPONENT
// =============================================================================
function Navbar({ user, activeTab, setActiveTab, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'sales', label: 'Sales', icon: '🛒' },
    { id: 'credit-customers', label: 'Credit Customers', icon: '👥' },
    { id: 'bulk-resellers', label: 'Bulk Resellers', icon: '🏪' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'supplier-reports', label: 'Supplier Reports', icon: '📋' },
    { id: 'settings', label: 'Settings', icon: '⚙️', adminOnly: true },
  ];

  const filteredNavItems = navItems.filter(item => 
    !item.adminOnly || user?.role === 'admin'
  );

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>JIMAS COMPUTERS</h1>
        </div>
        
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          ☰
        </button>

        <div className={`navbar-menu ${mobileMenuOpen ? 'open' : ''}`}>
          {filteredNavItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="navbar-user">
          <span className="user-info">
            {user?.name} ({user?.role})
          </span>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

// =============================================================================
// LOGIN PAGE COMPONENT
// =============================================================================
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLogin(data.token, data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>JIMAS COMPUTERS</h1>
          <h2>NIGERIA LIMITED</h2>
          <p>Inventory & POS System</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// DASHBOARD COMPONENT
// =============================================================================
function Dashboard({ token, user, setActiveTab }) {
  const [stats, setStats] = useState({
    todaySales: 0,
    weeklySales: 0,
    totalStock: 0,
    creditOwed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      const [dailyRes, weeklyRes, stockRes, creditRes] = await Promise.all([
        fetch(`${API_BASE}/reports/daily`, { headers }),
        fetch(`${API_BASE}/reports/weekly`, { headers }),
        fetch(`${API_BASE}/stock/groups`, { headers }),
        fetch(`${API_BASE}/credit-customers`, { headers })
      ]);

      const daily = await dailyRes.json();
      const weekly = await weeklyRes.json();
      const stock = await stockRes.json();
      const credit = await creditRes.json();

      const totalStock = stock.groups?.reduce((sum, g) => sum + parseInt(g.total_available || 0), 0) || 0;
      const creditOwed = credit.customers?.reduce((sum, c) => sum + parseFloat(c.open_balance || 0), 0) || 0;

      setStats({
        todaySales: daily.totals?.total_revenue || 0,
        weeklySales: weekly.totals?.total_revenue || 0,
        totalStock,
        creditOwed
      });
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>Today's Sales</h3>
            <p>₦{stats.todaySales.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <h3>Weekly Sales</h3>
            <p>₦{stats.weeklySales.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card purple">
          <div className="stat-icon">📦</div>
          <div className="stat-info">
            <h3>Total Stock</h3>
            <p>{stats.totalStock} units</p>
          </div>
        </div>

        <div className="stat-card orange">
          <div className="stat-icon">💳</div>
          <div className="stat-info">
            <h3>Credit Owed</h3>
            <p>₦{stats.creditOwed.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button className="action-btn" onClick={() => setActiveTab('inventory')}>
            <span>📦</span> Add Stock
          </button>
          <button className="action-btn" onClick={() => setActiveTab('sales')}>
            <span>🛒</span> New Sale
          </button>
          <button className="action-btn" onClick={() => setActiveTab('reports')}>
            <span>📊</span> View Reports
          </button>
          <button className="action-btn" onClick={() => setActiveTab('credit-customers')}>
            <span>👥</span> Credit Customers
          </button>
        </div>
      </div>
    </div>
  );
}
// =============================================================================
// INVENTORY COMPONENT
// =============================================================================
function Inventory({ token, user }) {
  const [view, setView] = useState('list');
  const [stockGroups, setStockGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupItems, setGroupItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Add Stock Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({
    product_name: '',
    specifications: '',
    serial_number: '',
    branch_name: '',
    supplier_name: '',
    cost_price: ''
  });
  const [addSuccess, setAddSuccess] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // Transfer Form State
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferData, setTransferData] = useState({
    serial_number: '',
    to_branch_name: ''
  });
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMessage, setTransferMessage] = useState('');

  useEffect(() => {
    loadStockGroups();
    loadBranchesAndSuppliers();
  }, []);

  const loadBranchesAndSuppliers = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [branchRes, supplierRes] = await Promise.all([
        fetch(`${API_BASE}/branches`, { headers }),
        fetch(`${API_BASE}/suppliers`, { headers })
      ]);
      const branchData = await branchRes.json();
      const supplierData = await supplierRes.json();
      setBranches(branchData.branches || []);
      setSuppliers(supplierData.suppliers || []);
    } catch (err) {
      console.error('Error loading branches/suppliers:', err);
    }
  };

  const loadStockGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stock/groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStockGroups(data.groups || []);
    } catch (err) {
      console.error('Error loading stock:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupItems = async (productName) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/stock/groups/${encodeURIComponent(productName)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setGroupItems(data.items || []);
      setSelectedGroup(productName);
      setView('details');
    } catch (err) {
      console.error('Error loading group items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    setAddLoading(true);

    try {
      const res = await fetch(`${API_BASE}/stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addFormData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add stock');
      }

      setAddSuccess(`✓ Successfully added: ${addFormData.serial_number}`);
      
      // Clear only serial number - keep other fields for quick re-entry
      setAddFormData(prev => ({
        ...prev,
        serial_number: ''
      }));

      // Refresh stock list
      loadStockGroups();

    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleReturnToSupplier = async (serialNumber) => {
    if (!window.confirm(`Return ${serialNumber} to supplier? This will remove it from inventory.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/stock/${serialNumber}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Returned to supplier' })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to return stock');
      }

      alert('Stock returned to supplier successfully');
      loadGroupItems(selectedGroup);
      loadStockGroups();

    } catch (err) {
      alert(err.message);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setTransferLoading(true);
    setTransferMessage('');

    try {
      const res = await fetch(`${API_BASE}/stock/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(transferData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to transfer stock');
      }

      setTransferMessage(`✓ Transferred ${transferData.serial_number} to ${transferData.to_branch_name}`);
      setTransferData({ serial_number: '', to_branch_name: '' });
      loadStockGroups();
      if (selectedGroup) {
        loadGroupItems(selectedGroup);
      }

    } catch (err) {
      setTransferMessage(`✗ Error: ${err.message}`);
    } finally {
      setTransferLoading(false);
    }
  };

  // Add Stock Form View
  if (showAddForm) {
    return (
      <div className="inventory">
        <div className="page-header">
          <h2>Add Stock</h2>
          <button className="btn secondary" onClick={() => setShowAddForm(false)}>
            ← Back to Inventory
          </button>
        </div>

        <div className="form-container">
          {addSuccess && <div className="success-message">{addSuccess}</div>}
          {addError && <div className="error-message">{addError}</div>}

          <form onSubmit={handleAddStock}>
            <div className="form-group">
              <label>Product Name *</label>
              <input
                type="text"
                value={addFormData.product_name}
                onChange={(e) => setAddFormData({...addFormData, product_name: e.target.value})}
                placeholder="e.g., Dell Latitude 5520"
                required
              />
            </div>

            <div className="form-group">
              <label>Specifications</label>
              <textarea
                value={addFormData.specifications}
                onChange={(e) => setAddFormData({...addFormData, specifications: e.target.value})}
                placeholder="e.g., Intel Core i5, 8GB RAM, 256GB SSD"
                rows="3"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Branch *</label>
                <select
                  value={addFormData.branch_name}
                  onChange={(e) => setAddFormData({...addFormData, branch_name: e.target.value})}
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Supplier *</label>
                <select
                  value={addFormData.supplier_name}
                  onChange={(e) => setAddFormData({...addFormData, supplier_name: e.target.value})}
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Cost Price (₦) *</label>
                <input
                  type="number"
                  value={addFormData.cost_price}
                  onChange={(e) => setAddFormData({...addFormData, cost_price: e.target.value})}
                  placeholder="e.g., 350000"
                  required
                />
              </div>

              <div className="form-group">
                <label>Serial Number *</label>
                <input
                  type="text"
                  value={addFormData.serial_number}
                  onChange={(e) => setAddFormData({...addFormData, serial_number: e.target.value})}
                  placeholder="Enter serial number"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="btn primary" disabled={addLoading}>
              {addLoading ? 'Adding...' : 'Add Stock'}
            </button>
          </form>

          <div className="form-tip">
            <strong>💡 Tip:</strong> After adding, only the serial number field clears. 
            Keep entering serial numbers to quickly add multiple laptops of the same model!
          </div>
        </div>
      </div>
    );
  }

  // Transfer Stock Form View
  if (showTransferForm) {
    return (
      <div className="inventory">
        <div className="page-header">
          <h2>Transfer Stock</h2>
          <button className="btn secondary" onClick={() => setShowTransferForm(false)}>
            ← Back to Inventory
          </button>
        </div>

        <div className="form-container">
          {transferMessage && (
            <div className={transferMessage.startsWith('✓') ? 'success-message' : 'error-message'}>
              {transferMessage}
            </div>
          )}

          <form onSubmit={handleTransfer}>
            <div className="form-group">
              <label>Serial Number *</label>
              <input
                type="text"
                value={transferData.serial_number}
                onChange={(e) => setTransferData({...transferData, serial_number: e.target.value})}
                placeholder="Enter serial number to transfer"
                required
              />
            </div>

            <div className="form-group">
              <label>Transfer To Branch *</label>
              <select
                value={transferData.to_branch_name}
                onChange={(e) => setTransferData({...transferData, to_branch_name: e.target.value})}
                required
              >
                <option value="">Select Destination Branch</option>
                {branches.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn primary" disabled={transferLoading}>
              {transferLoading ? 'Transferring...' : 'Transfer Stock'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Stock Details View
  if (view === 'details' && selectedGroup) {
    return (
      <div className="inventory">
        <div className="page-header">
          <h2>{selectedGroup}</h2>
          <button className="btn secondary" onClick={() => { setView('list'); setSelectedGroup(null); }}>
            ← Back to Inventory
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Serial Number</th>
                  <th>Specifications</th>
                  <th>Branch</th>
                  <th>Cost Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">No items found</td>
                  </tr>
                ) : (
                  groupItems.map(item => (
                    <tr key={item.serial_number}>
                      <td className="serial-number">{item.serial_number}</td>
                      <td>{item.specifications || '-'}</td>
                      <td>{item.branch_name}</td>
                      <td>₦{parseFloat(item.cost_price).toLocaleString()}</td>
                      <td>
                        <span className={`status-badge ${item.status}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn small danger"
                          onClick={() => handleReturnToSupplier(item.serial_number)}
                        >
                          Return to Supplier
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // Main Inventory List View
  return (
    <div className="inventory">
      <div className="page-header">
        <h2>Inventory</h2>
        <div className="header-actions">
          <button className="btn primary" onClick={() => setShowAddForm(true)}>
            + Add Stock
          </button>
          {user?.role === 'admin' && (
            <button className="btn secondary" onClick={() => setShowTransferForm(true)}>
              ↔ Transfer Stock
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading inventory...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                {user?.role === 'admin' && <th>Branch</th>}
                <th>Available Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stockGroups.length === 0 ? (
                <tr>
                  <td colSpan={user?.role === 'admin' ? 4 : 3} className="empty-state">
                    No stock available. Click "Add Stock" to add inventory.
                  </td>
                </tr>
              ) : (
                stockGroups.map((group, idx) => (
                  <tr key={idx}>
                    <td className="product-name">{group.product_name}</td>
                    {user?.role === 'admin' && <td>{group.branch_name}</td>}
                    <td>
                      <span className={`stock-count ${parseInt(group.total_available) <= 5 ? 'low' : ''}`}>
                        {group.total_available} units
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn small primary"
                        onClick={() => loadGroupItems(group.product_name)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
// =============================================================================
// SALES COMPONENT
// =============================================================================
function Sales({ token, user }) {
  const [view, setView] = useState('menu');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  // New Sale State
  const [saleData, setSaleData] = useState({
    branch_name: '',
    payment_type: 'cash',
    customer_name: '',
    customer_phone: '',
    vat_enabled: false,
    vat_percentage: 7.5,
    items: [{ serial_number: '', price: '', ram_price: '', storage_price: '' }]
  });
  const [saleError, setSaleError] = useState('');
  const [saleSuccess, setSaleSuccess] = useState(null);

  // Return State
  const [returnData, setReturnData] = useState({
    return_type: 'cash',
    serial_number: '',
    sale_id: '',
    customer_phone: ''
  });
  const [returnMessage, setReturnMessage] = useState('');

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const res = await fetch(`${API_BASE}/branches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setBranches(data.branches || []);
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  const addItem = () => {
    setSaleData({
      ...saleData,
      items: [...saleData.items, { serial_number: '', price: '', ram_price: '', storage_price: '' }]
    });
  };

  const removeItem = (index) => {
    if (saleData.items.length === 1) return;
    const newItems = saleData.items.filter((_, i) => i !== index);
    setSaleData({ ...saleData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...saleData.items];
    newItems[index][field] = value;
    setSaleData({ ...saleData, items: newItems });
  };

  const calculateTotal = () => {
    let subtotal = saleData.items.reduce((sum, item) => {
      return sum + 
        (parseFloat(item.price) || 0) + 
        (parseFloat(item.ram_price) || 0) + 
        (parseFloat(item.storage_price) || 0);
    }, 0);

    let vatAmount = 0;
    if (saleData.vat_enabled && saleData.vat_percentage > 0) {
      vatAmount = (subtotal * saleData.vat_percentage) / 100;
    }

    return { subtotal, vatAmount, total: subtotal + vatAmount };
  };

  const handleNewSale = async (e) => {
    e.preventDefault();
    setSaleError('');
    setSaleSuccess(null);
    setLoading(true);

    try {
      const payload = {
        sold_by_email: user.email,
        branch_name: saleData.branch_name,
        payment_type: saleData.payment_type,
        customer_name: saleData.customer_name,
        customer_phone: saleData.customer_phone,
        vat_enabled: saleData.vat_enabled,
        vat_percentage: saleData.vat_enabled ? saleData.vat_percentage : 0,
        items: saleData.items.map(item => ({
          serial_number: item.serial_number,
          price: parseFloat(item.price) || 0,
          ram_price: parseFloat(item.ram_price) || 0,
          storage_price: parseFloat(item.storage_price) || 0
        }))
      };

      const res = await fetch(`${API_BASE}/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process sale');
      }

      setSaleSuccess(data);

    } catch (err) {
      setSaleError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (e) => {
    e.preventDefault();
    setReturnMessage('');
    setLoading(true);

    try {
      const endpoint = returnData.return_type === 'cash' ? '/cash-return' : '/credit-return';
      const payload = returnData.return_type === 'cash' 
        ? { serial_number: returnData.serial_number, sale_id: parseInt(returnData.sale_id) }
        : { 
            serial_number: returnData.serial_number, 
            sale_id: parseInt(returnData.sale_id),
            customer_phone: returnData.customer_phone 
          };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process return');
      }

      setReturnMessage(`✓ ${data.message}`);
      setReturnData({ return_type: 'cash', serial_number: '', sale_id: '', customer_phone: '' });

    } catch (err) {
      setReturnMessage(`✗ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetSaleForm = () => {
    setSaleData({
      branch_name: '',
      payment_type: 'cash',
      customer_name: '',
      customer_phone: '',
      vat_enabled: false,
      vat_percentage: 7.5,
      items: [{ serial_number: '', price: '', ram_price: '', storage_price: '' }]
    });
    setSaleSuccess(null);
    setSaleError('');
  };

  const printReceipt = (saleId) => {
    window.open(`${API_BASE}/receipt/sale/${saleId}`, '_blank');
  };

  // Sale Success View
  if (saleSuccess) {
    return (
      <div className="sales">
        <div className="success-container">
          <div className="success-icon">✓</div>
          <h2>Sale Completed!</h2>
          <div className="sale-summary">
            <p><strong>Sale ID:</strong> #{saleSuccess.sale_id}</p>
            <p><strong>Payment Type:</strong> {saleSuccess.payment_type.toUpperCase()}</p>
            <p><strong>Total Amount:</strong> ₦{parseFloat(saleSuccess.total_amount).toLocaleString()}</p>
            {saleSuccess.profit && (
              <p><strong>Profit:</strong> ₦{parseFloat(saleSuccess.profit).toLocaleString()}</p>
            )}
          </div>

          {saleSuccess.warning && (
            <div className="warning-message">{saleSuccess.warning}</div>
          )}

          <div className="success-actions">
            {saleSuccess.payment_type === 'cash' && (
              <button className="btn primary" onClick={() => printReceipt(saleSuccess.sale_id)}>
                🖨 Print Receipt
              </button>
            )}
            <button className="btn secondary" onClick={resetSaleForm}>
              + New Sale
            </button>
            <button className="btn secondary" onClick={() => setView('menu')}>
              ← Back to Menu
            </button>
          </div>

          {saleSuccess.payment_type === 'credit' && (
            <div className="info-message">
              ℹ Credit sales do not generate receipts. 
              Receipt will be generated when payment is made.
            </div>
          )}
        </div>
      </div>
    );
  }

  // New Sale Form View
  if (view === 'new-sale') {
    const totals = calculateTotal();

    return (
      <div className="sales">
        <div className="page-header">
          <h2>New Sale</h2>
          <button className="btn secondary" onClick={() => setView('menu')}>
            ← Back
          </button>
        </div>

        <div className="form-container">
          {saleError && <div className="error-message">{saleError}</div>}

          <form onSubmit={handleNewSale}>
            <div className="form-section">
              <h3>Sale Details</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Branch *</label>
                  <select
                    value={saleData.branch_name}
                    onChange={(e) => setSaleData({...saleData, branch_name: e.target.value})}
                    required
                  >
                    <option value="">Select Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Payment Type *</label>
                  <select
                    value={saleData.payment_type}
                    onChange={(e) => setSaleData({...saleData, payment_type: e.target.value})}
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="credit">Credit</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    value={saleData.customer_name}
                    onChange={(e) => setSaleData({...saleData, customer_name: e.target.value})}
                    placeholder="Enter customer name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Customer Phone *</label>
                  <input
                    type="text"
                    value={saleData.customer_phone}
                    onChange={(e) => setSaleData({...saleData, customer_phone: e.target.value})}
                    placeholder="e.g., 08012345678"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={saleData.vat_enabled}
                      onChange={(e) => setSaleData({...saleData, vat_enabled: e.target.checked})}
                    />
                    Enable VAT
                  </label>
                </div>

                {saleData.vat_enabled && (
                  <div className="form-group">
                    <label>VAT Percentage (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={saleData.vat_percentage}
                      onChange={(e) => setSaleData({...saleData, vat_percentage: parseFloat(e.target.value) || 0})}
                      placeholder="e.g., 7.5"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <h3>Items</h3>
                <button type="button" className="btn small secondary" onClick={addItem}>
                  + Add Item
                </button>
              </div>

              {saleData.items.map((item, index) => (
                <div key={index} className="item-card">
                  <div className="item-header">
                    <span>Item {index + 1}</span>
                    {saleData.items.length > 1 && (
                      <button 
                        type="button" 
                        className="btn small danger"
                        onClick={() => removeItem(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Serial Number *</label>
                      <input
                        type="text"
                        value={item.serial_number}
                        onChange={(e) => updateItem(index, 'serial_number', e.target.value)}
                        placeholder="Enter serial number"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Sale Price (₦) *</label>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', e.target.value)}
                        placeholder="e.g., 450000"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>RAM Upgrade (₦)</label>
                      <input
                        type="number"
                        value={item.ram_price}
                        onChange={(e) => updateItem(index, 'ram_price', e.target.value)}
                        placeholder="Optional"
                      />
                    </div>

                    <div className="form-group">
                      <label>Storage Upgrade (₦)</label>
                      <input
                        type="number"
                        value={item.storage_price}
                        onChange={(e) => updateItem(index, 'storage_price', e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="sale-totals">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>₦{totals.subtotal.toLocaleString()}</span>
              </div>
              {saleData.vat_enabled && (
                <div className="total-row">
                  <span>VAT ({saleData.vat_percentage}%):</span>
                  <span>₦{totals.vatAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="total-row grand-total">
                <span>Total:</span>
                <span>₦{totals.total.toLocaleString()}</span>
              </div>
            </div>

            <button type="submit" className="btn primary full-width" disabled={loading}>
              {loading ? 'Processing...' : 'Complete Sale'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Process Return View
  if (view === 'return') {
    return (
      <div className="sales">
        <div className="page-header">
          <h2>Process Return</h2>
          <button className="btn secondary" onClick={() => setView('menu')}>
            ← Back
          </button>
        </div>

        <div className="form-container">
          {returnMessage && (
            <div className={returnMessage.startsWith('✓') ? 'success-message' : 'error-message'}>
              {returnMessage}
            </div>
          )}

          <form onSubmit={handleReturn}>
            <div className="form-group">
              <label>Return Type *</label>
              <select
                value={returnData.return_type}
                onChange={(e) => setReturnData({...returnData, return_type: e.target.value})}
                required
              >
                <option value="cash">Cash Return</option>
                <option value="credit">Credit Return</option>
              </select>
            </div>

            <div className="form-group">
              <label>Serial Number *</label>
              <input
                type="text"
                value={returnData.serial_number}
                onChange={(e) => setReturnData({...returnData, serial_number: e.target.value})}
                placeholder="Enter serial number of item to return"
                required
              />
            </div>

            <div className="form-group">
              <label>Sale ID *</label>
              <input
                type="number"
                value={returnData.sale_id}
                onChange={(e) => setReturnData({...returnData, sale_id: e.target.value})}
                placeholder="Enter original sale ID"
                required
              />
            </div>

            {returnData.return_type === 'credit' && (
              <div className="form-group">
                <label>Customer Phone *</label>
                <input
                  type="text"
                  value={returnData.customer_phone}
                  onChange={(e) => setReturnData({...returnData, customer_phone: e.target.value})}
                  placeholder="Enter customer phone number"
                  required
                />
              </div>
            )}

            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Processing...' : 'Process Return'}
            </button>
          </form>

          <div className="form-tip">
            <strong>💡 Note:</strong> Returns will restore the laptop to available inventory 
            and adjust financial records accordingly.
          </div>
        </div>
      </div>
    );
  }

  // Sales Menu View
  return (
    <div className="sales">
      <h2>Sales</h2>
      
      <div className="menu-grid">
        <div className="menu-card" onClick={() => setView('new-sale')}>
          <div className="menu-icon">🛒</div>
          <h3>New Sale</h3>
          <p>Process a new cash or credit sale</p>
        </div>

        <div className="menu-card" onClick={() => setView('return')}>
          <div className="menu-icon">↩️</div>
          <h3>Process Return</h3>
          <p>Return a sold laptop to inventory</p>
        </div>
      </div>
    </div>
  );
}
// =============================================================================
// CREDIT CUSTOMERS COMPONENT
// =============================================================================
function CreditCustomers({ token, user }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDebts, setCustomerDebts] = useState(null);
  const [view, setView] = useState('list');

  // Payment Form State
  const [paymentData, setPaymentData] = useState({
    sale_id: '',
    amount: ''
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/credit-customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      // Filter only regular credit customers (not bulk resellers)
      const regularCustomers = (data.customers || []).filter(c => c.customer_type !== 'bulk_reseller');
      setCustomers(regularCustomers);
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerDebts = async (phone) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/credit-customers/${phone}/debts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCustomerDebts(data);
      setSelectedCustomer(data.customer);
      setView('details');
    } catch (err) {
      console.error('Error loading debts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setPaymentLoading(true);
    setPaymentMessage('');

    try {
      const res = await fetch(`${API_BASE}/credit-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_phone: selectedCustomer.contact_info,
          sale_id: parseInt(paymentData.sale_id),
          amount: parseFloat(paymentData.amount)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process payment');
      }

      setPaymentMessage(`✓ Payment of ₦${parseFloat(data.amount_paid).toLocaleString()} recorded successfully!`);
      setPaymentData({ sale_id: '', amount: '' });
      
      // Reload customer debts
      loadCustomerDebts(selectedCustomer.contact_info);
      loadCustomers();

      // Open receipt
      if (data.receipt_url) {
        window.open(`${API_BASE}${data.receipt_url}`, '_blank');
      }

    } catch (err) {
      setPaymentMessage(`✗ Error: ${err.message}`);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Customer Details View
  if (view === 'details' && selectedCustomer) {
    return (
      <div className="credit-customers">
        <div className="page-header">
          <h2>Customer Details</h2>
          <button className="btn secondary" onClick={() => { setView('list'); setSelectedCustomer(null); setCustomerDebts(null); }}>
            ← Back to Customers
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            <div className="customer-info-card">
              <div className="customer-header">
                <div>
                  <h3>{selectedCustomer.name}</h3>
                  <p>{selectedCustomer.contact_info}</p>
                </div>
                <div className="customer-balance">
                  <span className="balance-label">Total Owed</span>
                  <span className="balance-amount">₦{parseFloat(selectedCustomer.open_balance || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="section">
              <h3>Record Payment</h3>
              
              {paymentMessage && (
                <div className={paymentMessage.startsWith('✓') ? 'success-message' : 'error-message'}>
                  {paymentMessage}
                </div>
              )}

              <form onSubmit={handlePayment} className="payment-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Sale ID *</label>
                    <select
                      value={paymentData.sale_id}
                      onChange={(e) => setPaymentData({...paymentData, sale_id: e.target.value})}
                      required
                    >
                      <option value="">Select Sale</option>
                      {customerDebts?.unsettled_sales?.map(sale => (
                        <option key={sale.sale_id} value={sale.sale_id}>
                          Sale #{sale.sale_id} - Owes ₦{parseFloat(sale.unsettled_balance).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Amount (₦) *</label>
                    <input
                      type="number"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                      placeholder="Enter payment amount"
                      required
                    />
                  </div>

                  <button type="submit" className="btn primary" disabled={paymentLoading}>
                    {paymentLoading ? 'Processing...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>

            <div className="section">
              <h3>Unsettled Sales</h3>
              
              {customerDebts?.unsettled_sales?.length === 0 ? (
                <div className="empty-state">No unsettled sales. All paid up! 🎉</div>
              ) : (
                <div className="debts-list">
                  {customerDebts?.unsettled_sales?.map(sale => (
                    <div key={sale.sale_id} className="debt-card">
                      <div className="debt-header">
                        <span className="sale-id">Sale #{sale.sale_id}</span>
                        <span className="sale-date">
                          {new Date(sale.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="debt-details">
                        <div className="debt-items">
                          {sale.items?.map((item, idx) => (
                            <div key={idx} className="debt-item">
                              <span>{item.product_name}</span>
                              <span>₦{parseFloat(item.price).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        <div className="debt-totals">
                          <div className="debt-row">
                            <span>Total Amount:</span>
                            <span>₦{parseFloat(sale.total_amount).toLocaleString()}</span>
                          </div>
                          <div className="debt-row outstanding">
                            <span>Outstanding:</span>
                            <span>₦{parseFloat(sale.unsettled_balance).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // Customer List View
  return (
    <div className="credit-customers">
      <div className="page-header">
        <h2>Credit Customers</h2>
      </div>

      {loading ? (
        <div className="loading">Loading customers...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Total Purchases</th>
                <th>Open Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    No credit customers yet. Credit customers are created automatically when you make a credit sale.
                  </td>
                </tr>
              ) : (
                customers.map(customer => (
                  <tr key={customer.id}>
                    <td className="customer-name">{customer.name}</td>
                    <td>{customer.contact_info}</td>
                    <td>₦{parseFloat(customer.total_purchases || 0).toLocaleString()}</td>
                    <td>
                      <span className={`balance ${parseFloat(customer.open_balance) > 0 ? 'owing' : 'clear'}`}>
                        ₦{parseFloat(customer.open_balance || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn small primary"
                        onClick={() => loadCustomerDebts(customer.contact_info)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BULK RESELLERS COMPONENT
// =============================================================================
function BulkResellers({ token, user }) {
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [selectedReseller, setSelectedReseller] = useState(null);
  const [creditBook, setCreditBook] = useState(null);
  const [branches, setBranches] = useState([]);

  // Create Reseller Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createData, setCreateData] = useState({ name: '', contact_info: '' });
  const [createMessage, setCreateMessage] = useState('');

  // Add Laptops Form
  const [showAddLaptops, setShowAddLaptops] = useState(false);
  const [addLaptopsData, setAddLaptopsData] = useState({
    branch_name: '',
    items: [{ serial_number: '', given_price: '' }]
  });
  const [addLaptopsMessage, setAddLaptopsMessage] = useState('');

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    loadResellers();
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const res = await fetch(`${API_BASE}/branches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setBranches(data.branches || []);
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  const loadResellers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bulk-resellers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setResellers(data.resellers || []);
    } catch (err) {
      console.error('Error loading resellers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCreditBook = async (resellerId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bulk-resellers/${resellerId}/credit-book`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCreditBook(data);
      setSelectedReseller(data.reseller);
      setView('credit-book');
    } catch (err) {
      console.error('Error loading credit book:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReseller = async (e) => {
    e.preventDefault();
    setCreateMessage('');

    try {
      const res = await fetch(`${API_BASE}/bulk-resellers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(createData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create reseller');
      }

      setCreateMessage(`✓ ${data.message}`);
      setCreateData({ name: '', contact_info: '' });
      loadResellers();

    } catch (err) {
      setCreateMessage(`✗ Error: ${err.message}`);
    }
  };

  const addLaptopItem = () => {
    setAddLaptopsData({
      ...addLaptopsData,
      items: [...addLaptopsData.items, { serial_number: '', given_price: '' }]
    });
  };

  const removeLaptopItem = (index) => {
    if (addLaptopsData.items.length === 1) return;
    const newItems = addLaptopsData.items.filter((_, i) => i !== index);
    setAddLaptopsData({ ...addLaptopsData, items: newItems });
  };

  const updateLaptopItem = (index, field, value) => {
    const newItems = [...addLaptopsData.items];
    newItems[index][field] = value;
    setAddLaptopsData({ ...addLaptopsData, items: newItems });
  };

  const handleAddLaptops = async (e) => {
    e.preventDefault();
    setAddLaptopsMessage('');

    try {
      const res = await fetch(`${API_BASE}/bulk-resellers/${selectedReseller.id}/add-laptops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          branch_name: addLaptopsData.branch_name,
          items: addLaptopsData.items.map(item => ({
            serial_number: item.serial_number,
            given_price: parseFloat(item.given_price)
          }))
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add laptops');
      }

      setAddLaptopsMessage(`✓ ${data.message}`);
      setAddLaptopsData({ branch_name: '', items: [{ serial_number: '', given_price: '' }] });
      loadCreditBook(selectedReseller.id);

    } catch (err) {
      setAddLaptopsMessage(`✗ Error: ${err.message}`);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setPaymentLoading(true);
    setPaymentMessage('');

    try {
      const res = await fetch(`${API_BASE}/bulk-resellers/${selectedReseller.id}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parseFloat(paymentAmount) })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process payment');
      }

      setPaymentMessage(`✓ Payment of ₦${parseFloat(data.amount_paid).toLocaleString()} recorded. Balance: ₦${parseFloat(data.balance_left).toLocaleString()}`);
      setPaymentAmount('');
      loadCreditBook(selectedReseller.id);
      loadResellers();

      // Open receipt
      if (data.receipt_url) {
        window.open(`${API_BASE}${data.receipt_url}`, '_blank');
      }

    } catch (err) {
      setPaymentMessage(`✗ Error: ${err.message}`);
    } finally {
      setPaymentLoading(false);
    }
  };

  // Create Reseller Form View
  if (showCreateForm) {
    return (
      <div className="bulk-resellers">
        <div className="page-header">
          <h2>Create Bulk Reseller</h2>
          <button className="btn secondary" onClick={() => setShowCreateForm(false)}>
            ← Back
          </button>
        </div>

        <div className="form-container">
          {createMessage && (
            <div className={createMessage.startsWith('✓') ? 'success-message' : 'error-message'}>
              {createMessage}
            </div>
          )}

          <form onSubmit={handleCreateReseller}>
            <div className="form-group">
              <label>Reseller Name *</label>
              <input
                type="text"
                value={createData.name}
                onChange={(e) => setCreateData({...createData, name: e.target.value})}
                placeholder="e.g., Emeka Electronics"
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="text"
                value={createData.contact_info}
                onChange={(e) => setCreateData({...createData, contact_info: e.target.value})}
                placeholder="e.g., 08012345678"
                required
              />
            </div>

            <button type="submit" className="btn primary">
              Create Reseller
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Add Laptops Form View
  if (showAddLaptops && selectedReseller) {
    return (
      <div className="bulk-resellers">
        <div className="page-header">
          <h2>Add Laptops to {selectedReseller.name}</h2>
          <button className="btn secondary" onClick={() => setShowAddLaptops(false)}>
            ← Back
          </button>
        </div>

        <div className="form-container">
          {addLaptopsMessage && (
            <div className={addLaptopsMessage.startsWith('✓') ? 'success-message' : 'error-message'}>
              {addLaptopsMessage}
            </div>
          )}

          <form onSubmit={handleAddLaptops}>
            <div className="form-group">
              <label>Branch *</label>
              <select
                value={addLaptopsData.branch_name}
                onChange={(e) => setAddLaptopsData({...addLaptopsData, branch_name: e.target.value})}
                required
              >
                <option value="">Select Branch</option>
                {branches.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="form-section">
              <div className="section-header">
                <h3>Laptops</h3>
                <button type="button" className="btn small secondary" onClick={addLaptopItem}>
                  + Add More
                </button>
              </div>

              {addLaptopsData.items.map((item, index) => (
                <div key={index} className="item-row">
                  <div className="form-group">
                    <label>Serial Number *</label>
                    <input
                      type="text"
                      value={item.serial_number}
                      onChange={(e) => updateLaptopItem(index, 'serial_number', e.target.value)}
                      placeholder="Enter serial number"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Given Price (₦) *</label>
                    <input
                      type="number"
                      value={item.given_price}
                      onChange={(e) => updateLaptopItem(index, 'given_price', e.target.value)}
                      placeholder="Price given to reseller"
                      required
                    />
                  </div>
                  {addLaptopsData.items.length > 1 && (
                    <button 
                      type="button" 
                      className="btn small danger"
                      onClick={() => removeLaptopItem(index)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button type="submit" className="btn primary">
              Add Laptops to Credit Book
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Credit Book View
  if (view === 'credit-book' && selectedReseller) {
    return (
      <div className="bulk-resellers">
        <div className="page-header">
          <h2>{selectedReseller.name}'s Credit Book</h2>
          <button className="btn secondary" onClick={() => { setView('list'); setSelectedReseller(null); setCreditBook(null); }}>
            ← Back to Resellers
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            <div className="reseller-summary">
              <div className="summary-card">
                <span className="label">Total Laptops</span>
                <span className="value">{creditBook?.total_items || 0}</span>
              </div>
              <div className="summary-card">
                <span className="label">Total Owed</span>
                <span className="value owing">₦{parseFloat(creditBook?.total_owed || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="action-buttons">
              <button className="btn primary" onClick={() => setShowAddLaptops(true)}>
                + Add Laptops
              </button>
            </div>

            <div className="section">
              <h3>Record Payment</h3>
              
              {paymentMessage && (
                <div className={paymentMessage.startsWith('✓') ? 'success-message' : 'error-message'}>
                  {paymentMessage}
                </div>
              )}

              <form onSubmit={handlePayment} className="payment-form inline">
                <div className="form-group">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter payment amount"
                    required
                  />
                </div>
                <button type="submit" className="btn primary" disabled={paymentLoading}>
                  {paymentLoading ? 'Processing...' : 'Record Payment'}
                </button>
              </form>
            </div>

            <div className="section">
              <h3>Laptops in Credit Book</h3>
              
              {creditBook?.items?.length === 0 ? (
                <div className="empty-state">No laptops in credit book yet.</div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Serial Number</th>
                        <th>Given Price</th>
                        <th>Date Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditBook?.items?.map(item => (
                        <tr key={item.id}>
                          <td>{item.product_name}</td>
                          <td className="serial-number">{item.serial_number}</td>
                          <td>₦{parseFloat(item.given_price).toLocaleString()}</td>
                          <td>{new Date(item.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // Resellers List View
  return (
    <div className="bulk-resellers">
      <div className="page-header">
        <h2>Bulk Resellers</h2>
        {user?.role === 'admin' && (
          <button className="btn primary" onClick={() => setShowCreateForm(true)}>
            + Add Reseller
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading resellers...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Total Purchases</th>
                <th>Balance Owed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resellers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    No bulk resellers yet. Click "Add Reseller" to create one.
                  </td>
                </tr>
              ) : (
                resellers.map(reseller => (
                  <tr key={reseller.id}>
                    <td className="reseller-name">{reseller.name}</td>
                    <td>{reseller.contact_info}</td>
                    <td>₦{parseFloat(reseller.total_purchases || 0).toLocaleString()}</td>
                    <td>
                      <span className={`balance ${parseFloat(reseller.open_balance) > 0 ? 'owing' : 'clear'}`}>
                        ₦{parseFloat(reseller.open_balance || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn small primary"
                        onClick={() => loadCreditBook(reseller.id)}
                      >
                        View Credit Book
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
// =============================================================================
// REPORTS COMPONENT
// =============================================================================
function Reports({ token, user }) {
  const [reportType, setReportType] = useState('daily');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  
  // Filter State
  const [filters, setFilters] = useState({
    branch_name: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadReport();
  }, [reportType]);

  const loadBranches = async () => {
    try {
      const res = await fetch(`${API_BASE}/branches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setBranches(data.branches || []);
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    setReportData(null);

    try {
      let url = `${API_BASE}/reports/${reportType}?`;

      if (filters.branch_name) {
        url += `branch_name=${encodeURIComponent(filters.branch_name)}&`;
      }

      if (reportType === 'monthly') {
        url += `month=${filters.month}&year=${filters.year}&`;
      }

      if (reportType === 'yearly') {
        url += `year=${filters.year}&`;
      }

      if (reportType === 'custom') {
        if (!filters.start_date || !filters.end_date) {
          setLoading(false);
          return;
        }
        url += `start_date=${filters.start_date}&end_date=${filters.end_date}&`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load report');
      }

      setReportData(data);

    } catch (err) {
      console.error('Error loading report:', err);
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = (saleId) => {
    window.open(`${API_BASE}/receipt/sale/${saleId}`, '_blank');
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(y);
  }

  return (
    <div className="reports">
      <div className="page-header">
        <h2>Sales Reports</h2>
      </div>

      <div className="report-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {user?.role === 'admin' && (
            <div className="filter-group">
              <label>Branch</label>
              <select
                value={filters.branch_name}
                onChange={(e) => setFilters({...filters, branch_name: e.target.value})}
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'monthly' && (
            <>
              <div className="filter-group">
                <label>Month</label>
                <select
                  value={filters.month}
                  onChange={(e) => setFilters({...filters, month: parseInt(e.target.value)})}
                >
                  {months.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Year</label>
                <select
                  value={filters.year}
                  onChange={(e) => setFilters({...filters, year: parseInt(e.target.value)})}
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {reportType === 'yearly' && (
            <div className="filter-group">
              <label>Year</label>
              <select
                value={filters.year}
                onChange={(e) => setFilters({...filters, year: parseInt(e.target.value)})}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'custom' && (
            <>
              <div className="filter-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                />
              </div>
              <div className="filter-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                />
              </div>
            </>
          )}

          <button className="btn primary" onClick={loadReport}>
            Generate Report
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Generating report...</div>
      ) : reportData ? (
        <div className="report-content">
          <div className="report-summary">
            <div className="summary-card">
              <span className="label">Total Cost</span>
              <span className="value">₦{parseFloat(reportData.totals?.total_cost || 0).toLocaleString()}</span>
            </div>
            <div className="summary-card">
              <span className="label">Total Revenue</span>
              <span className="value">₦{parseFloat(reportData.totals?.total_revenue || 0).toLocaleString()}</span>
            </div>
            <div className="summary-card highlight">
              <span className="label">Total Profit</span>
              <span className="value">₦{parseFloat(reportData.totals?.total_profit || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="report-table">
            <h3>Sales Details ({reportData.sales?.length || 0} transactions)</h3>
            
            {reportData.sales?.length === 0 ? (
              <div className="empty-state">No sales found for this period.</div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Sale ID</th>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Serial</th>
                      <th>Customer</th>
                      <th>Type</th>
                      <th>Cost</th>
                      <th>Sale Price</th>
                      <th>Profit</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.sales?.map((sale, idx) => (
                      <tr key={idx}>
                        <td>#{sale.sale_id}</td>
                        <td>{new Date(sale.sale_date || sale.created_at).toLocaleDateString()}</td>
                        <td>{sale.product_name}</td>
                        <td className="serial-number">{sale.serial_number}</td>
                        <td>{sale.customer_name}</td>
                        <td>
                          <span className={`payment-type ${sale.payment_type}`}>
                            {sale.payment_type}
                          </span>
                        </td>
                        <td>₦{parseFloat(sale.cost_price).toLocaleString()}</td>
                        <td>₦{parseFloat(sale.sale_price).toLocaleString()}</td>
                        <td className="profit">₦{parseFloat(sale.profit).toLocaleString()}</td>
                        <td>
                          {sale.payment_type === 'cash' && (
                            <button 
                              className="btn small secondary"
                              onClick={() => printReceipt(sale.sale_id)}
                            >
                              🖨 Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          Select filters and click "Generate Report" to view sales data.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUPPLIER REPORTS COMPONENT
// =============================================================================
function SupplierReports({ token, user }) {
  const [view, setView] = useState('list');
  const [reports, setReports] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  // Create Report Form
  const [formData, setFormData] = useState({
    supplier_name: '',
    total_supplied: '',
    good_units: '',
    faults: [{ fault_type: '', count: '' }],
    notes: ''
  });
  const [formMessage, setFormMessage] = useState('');

  useEffect(() => {
    loadReports();
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const res = await fetch(`${API_BASE}/suppliers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch (err) {
      console.error('Error loading suppliers:', err);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/supplier-reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const addFault = () => {
    setFormData({
      ...formData,
      faults: [...formData.faults, { fault_type: '', count: '' }]
    });
  };

  const removeFault = (index) => {
    if (formData.faults.length === 1) return;
    const newFaults = formData.faults.filter((_, i) => i !== index);
    setFormData({ ...formData, faults: newFaults });
  };

  const updateFault = (index, field, value) => {
    const newFaults = [...formData.faults];
    newFaults[index][field] = value;
    setFormData({ ...formData, faults: newFaults });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMessage('');

    try {
      const payload = {
        supplier_name: formData.supplier_name,
        total_supplied: parseInt(formData.total_supplied),
        good_units: parseInt(formData.good_units),
        faults: formData.faults
          .filter(f => f.fault_type && f.count)
          .map(f => ({ fault_type: f.fault_type, count: parseInt(f.count) })),
        notes: formData.notes
      };

      const res = await fetch(`${API_BASE}/supplier-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create report');
      }

      setFormMessage(`✓ Report created successfully!`);
      setFormData({
        supplier_name: '',
        total_supplied: '',
        good_units: '',
        faults: [{ fault_type: '', count: '' }],
        notes: ''
      });
      loadReports();

    } catch (err) {
      setFormMessage(`✗ Error: ${err.message}`);
    }
  };

  const commonFaultTypes = [
    'Bad Keyboard',
    'Bad Screen',
    'Not Charging',
    'Touchpad Issues',
    'Dead Pixels',
    'Battery Issues',
    'Speaker Issues',
    'USB Port Issues',
    'Hinge Problems',
    'Other'
  ];

  // Report Details View
  if (view === 'details' && selectedReport) {
    const faults = typeof selectedReport.faults_breakdown === 'string' 
      ? JSON.parse(selectedReport.faults_breakdown) 
      : selectedReport.faults_breakdown;

    return (
      <div className="supplier-reports">
        <div className="page-header">
          <h2>Report Details</h2>
          <button className="btn secondary" onClick={() => { setView('list'); setSelectedReport(null); }}>
            ← Back to Reports
          </button>
        </div>

        <div className="report-detail-card">
          <div className="detail-header">
            <h3>{selectedReport.supplier_name}</h3>
            <span className="report-date">
              {new Date(selectedReport.created_at).toLocaleDateString()}
            </span>
          </div>

          <div className="detail-summary">
            <div className="summary-item">
              <span className="label">Total Supplied</span>
              <span className="value">{selectedReport.total_supplied}</span>
            </div>
            <div className="summary-item good">
              <span className="label">Good Units</span>
              <span className="value">{selectedReport.good_units}</span>
            </div>
            <div className="summary-item bad">
              <span className="label">Faulty Units</span>
              <span className="value">{selectedReport.total_faulty}</span>
            </div>
            <div className="summary-item">
              <span className="label">Success Rate</span>
              <span className="value">
                {((selectedReport.good_units / selectedReport.total_supplied) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          {faults && faults.length > 0 && (
            <div className="faults-breakdown">
              <h4>Faults Breakdown</h4>
              <div className="faults-list">
                {faults.map((fault, idx) => (
                  <div key={idx} className="fault-item">
                    <span className="fault-type">{fault.fault_type}</span>
                    <span className="fault-count">{fault.count} units</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedReport.notes && (
            <div className="report-notes">
              <h4>Notes</h4>
              <p>{selectedReport.notes}</p>
            </div>
          )}

          <div className="report-meta">
            <span>Reported by: {selectedReport.reported_by}</span>
          </div>
        </div>
      </div>
    );
  }

  // Create Report Form View
  if (view === 'create') {
    return (
      <div className="supplier-reports">
        <div className="page-header">
          <h2>Create Supplier Fault Report</h2>
          <button className="btn secondary" onClick={() => setView('list')}>
            ← Back to Reports
          </button>
        </div>

        <div className="form-container">
          {formMessage && (
            <div className={formMessage.startsWith('✓') ? 'success-message' : 'error-message'}>
              {formMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Supplier *</label>
              <select
                value={formData.supplier_name}
                onChange={(e) => setFormData({...formData, supplier_name: e.target.value})}
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Total Units Supplied *</label>
                <input
                  type="number"
                  value={formData.total_supplied}
                  onChange={(e) => setFormData({...formData, total_supplied: e.target.value})}
                  placeholder="e.g., 50"
                  required
                />
              </div>

              <div className="form-group">
                <label>Good Units *</label>
                <input
                  type="number"
                  value={formData.good_units}
                  onChange={(e) => setFormData({...formData, good_units: e.target.value})}
                  placeholder="e.g., 45"
                  required
                />
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <h3>Faults</h3>
                <button type="button" className="btn small secondary" onClick={addFault}>
                  + Add Fault
                </button>
              </div>

              {formData.faults.map((fault, index) => (
                <div key={index} className="fault-row">
                  <div className="form-group">
                    <label>Fault Type</label>
                    <select
                      value={fault.fault_type}
                      onChange={(e) => updateFault(index, 'fault_type', e.target.value)}
                    >
                      <option value="">Select Fault Type</option>
                      {commonFaultTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Count</label>
                    <input
                      type="number"
                      value={fault.count}
                      onChange={(e) => updateFault(index, 'count', e.target.value)}
                      placeholder="Number of units"
                    />
                  </div>
                  {formData.faults.length > 1 && (
                    <button 
                      type="button" 
                      className="btn small danger"
                      onClick={() => removeFault(index)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Additional notes about this delivery..."
                rows="3"
              />
            </div>

            <button type="submit" className="btn primary">
              Submit Report
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Reports List View
  return (
    <div className="supplier-reports">
      <div className="page-header">
        <h2>Supplier Fault Reports</h2>
        <button className="btn primary" onClick={() => setView('create')}>
          + New Report
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading reports...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Supplier</th>
                <th>Total Supplied</th>
                <th>Good</th>
                <th>Faulty</th>
                <th>Success Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    No supplier reports yet. Click "New Report" to create one.
                  </td>
                </tr>
              ) : (
                reports.map(report => (
                  <tr key={report.id}>
                    <td>{new Date(report.created_at).toLocaleDateString()}</td>
                    <td className="supplier-name">{report.supplier_name}</td>
                    <td>{report.total_supplied}</td>
                    <td className="good-count">{report.good_units}</td>
                    <td className="faulty-count">{report.total_faulty}</td>
                    <td>
                      <span className={`success-rate ${(report.good_units / report.total_supplied) >= 0.9 ? 'good' : 'bad'}`}>
                        {((report.good_units / report.total_supplied) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn small primary"
                        onClick={() => { setSelectedReport(report); setView('details'); }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
// =============================================================================
// SETTINGS COMPONENT (Admin Only)
// =============================================================================
function Settings({ token, user }) {
  const [activeSection, setActiveSection] = useState('branches');

  return (
    <div className="settings">
      <h2>Settings</h2>

      <div className="settings-tabs">
        <button 
          className={`tab ${activeSection === 'branches' ? 'active' : ''}`}
          onClick={() => setActiveSection('branches')}
        >
          Branches
        </button>
        <button 
          className={`tab ${activeSection === 'suppliers' ? 'active' : ''}`}
          onClick={() => setActiveSection('suppliers')}
        >
          Suppliers
        </button>
        <button 
          className={`tab ${activeSection === 'users' ? 'active' : ''}`}
          onClick={() => setActiveSection('users')}
        >
          Users
        </button>
      </div>

      <div className="settings-content">
        {activeSection === 'branches' && <BranchesSettings token={token} />}
        {activeSection === 'suppliers' && <SuppliersSettings token={token} />}
        {activeSection === 'users' && <UsersSettings token={token} user={user} />}
      </div>
    </div>
  );
}

// =============================================================================
// BRANCHES SETTINGS COMPONENT
// =============================================================================
function BranchesSettings({ token }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '' });
  const [formMessage, setFormMessage] = useState('');

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/branches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setBranches(data.branches || []);
    } catch (err) {
      console.error('Error loading branches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMessage('');

    try {
      const res = await fetch(`${API_BASE}/branch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create branch');
      }

      setFormMessage('✓ Branch created successfully!');
      setFormData({ name: '', location: '' });
      loadBranches();

    } catch (err) {
      setFormMessage(`✗ Error: ${err.message}`);
    }
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>Branches</h3>
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Branch'}
        </button>
      </div>

      {showForm && (
        <div className="form-container compact">
          {formMessage && (
            <div className={formMessage.startsWith('✓') ? 'success-message' : 'error-message'}>
              {formMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Branch Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Ikeja Branch"
                  required
                />
              </div>
              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="e.g., 123 Main Street, Lagos"
                  required
                />
              </div>
              <button type="submit" className="btn primary">
                Add Branch
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading branches...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Branch Name</th>
                <th>Location</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {branches.length === 0 ? (
                <tr>
                  <td colSpan="3" className="empty-state">No branches yet.</td>
                </tr>
              ) : (
                branches.map(branch => (
                  <tr key={branch.id}>
                    <td className="branch-name">{branch.name}</td>
                    <td>{branch.location}</td>
                    <td>{new Date(branch.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUPPLIERS SETTINGS COMPONENT
// =============================================================================
function SuppliersSettings({ token }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', contact_info: '' });
  const [formMessage, setFormMessage] = useState('');

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/suppliers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch (err) {
      console.error('Error loading suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMessage('');

    try {
      const res = await fetch(`${API_BASE}/supplier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create supplier');
      }

      setFormMessage('✓ Supplier created successfully!');
      setFormData({ name: '', contact_info: '' });
      loadSuppliers();

    } catch (err) {
      setFormMessage(`✗ Error: ${err.message}`);
    }
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>Suppliers</h3>
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Supplier'}
        </button>
      </div>

      {showForm && (
        <div className="form-container compact">
          {formMessage && (
            <div className={formMessage.startsWith('✓') ? 'success-message' : 'error-message'}>
              {formMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Supplier Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Dell Nigeria"
                  required
                />
              </div>
              <div className="form-group">
                <label>Contact Info *</label>
                <input
                  type="text"
                  value={formData.contact_info}
                  onChange={(e) => setFormData({...formData, contact_info: e.target.value})}
                  placeholder="e.g., 08012345678, email@example.com"
                  required
                />
              </div>
              <button type="submit" className="btn primary">
                Add Supplier
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading suppliers...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th>Contact Info</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan="3" className="empty-state">No suppliers yet.</td>
                </tr>
              ) : (
                suppliers.map(supplier => (
                  <tr key={supplier.id}>
                    <td className="supplier-name">{supplier.name}</td>
                    <td>{supplier.contact_info}</td>
                    <td>{new Date(supplier.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// USERS SETTINGS COMPONENT
// =============================================================================
function UsersSettings({ token, user }) {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sales',
    branch_name: ''
  });
  const [formMessage, setFormMessage] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null);

  useEffect(() => {
    loadUsers();
    loadBranches();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const res = await fetch(`${API_BASE}/branches`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setBranches(data.branches || []);
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMessage('');

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setFormMessage('✓ User created successfully!');
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'sales',
        branch_name: ''
      });
      loadUsers();

    } catch (err) {
      setFormMessage(`✗ Error: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    setDeleteLoading(userId);

    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      alert('User deleted successfully!');
      loadUsers();

    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <h3>Users</h3>
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {showForm && (
        <div className="form-container compact">
          {formMessage && (
            <div className={formMessage.startsWith('✓') ? 'success-message' : 'error-message'}>
              {formMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., John Doe"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="e.g., john@jimas.com"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Enter password"
                  required
                />
              </div>
              <div className="form-group">
                <label>Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  required
                >
                  <option value="sales">Sales</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {formData.role === 'sales' && (
              <div className="form-group">
                <label>Assigned Branch *</label>
                <select
                  value={formData.branch_name}
                  onChange={(e) => setFormData({...formData, branch_name: e.target.value})}
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button type="submit" className="btn primary">
              Create User
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">No users found.</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id}>
                    <td className="user-name">{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge ${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.branch_name || 'All Branches'}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      {u.email !== user.email ? (
                        <button 
                          className="btn small danger"
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          disabled={deleteLoading === u.id}
                        >
                          {deleteLoading === u.id ? 'Deleting...' : 'Delete'}
                        </button>
                      ) : (
                        <span className="current-user">You</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EXPORT APP
// =============================================================================
export default App;