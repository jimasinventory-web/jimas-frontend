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
          
          {/* Mobile: User info and Logout inside menu */}
          <div className="mobile-user-section">
            <span className="mobile-user-info">
              {user?.name} ({user?.role})
            </span>
            <button className="logout-btn mobile-logout" onClick={onLogout}>
              Logout
            </button>
          </div>
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
          {user?.role === 'admin' && (
            <button className="action-btn" onClick={() => setActiveTab('inventory')}>
              <span>📦</span> Add Stock
            </button>
          )}
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
// INVENTORY COMPONENT - UPDATED: ADD/DELETE ADMIN ONLY
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

  // Add Stock Form View - ADMIN ONLY
  if (showAddForm && user?.role === 'admin') {
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

  // Transfer Stock Form View - ADMIN ONLY
  if (showTransferForm && user?.role === 'admin') {
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
                  {user?.role === 'admin' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {groupItems.length === 0 ? (
                  <tr>
                    <td colSpan={user?.role === 'admin' ? 6 : 5} className="empty-state">No items found</td>
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
                      {user?.role === 'admin' && (
                        <td>
                          <button 
                            className="btn small danger"
                            onClick={() => handleReturnToSupplier(item.serial_number)}
                          >
                            Return to Supplier
                          </button>
                        </td>
                      )}
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
          {user?.role === 'admin' && (
            <>
              <button className="btn primary" onClick={() => setShowAddForm(true)}>
                + Add Stock
              </button>
              <button className="btn secondary" onClick={() => setShowTransferForm(true)}>
                ↔ Transfer Stock
              </button>
            </>
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
                    No stock available. {user?.role === 'admin' ? 'Click "Add Stock" to add inventory.' : 'Contact admin to add stock.'}
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
// SALES COMPONENT - UPDATED WITH SALES_NOTE
// =============================================================================
function Sales({ token, user }) {
  const [view, setView] = useState('menu');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Credit customers for searchable dropdown
  const [creditCustomers, setCreditCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedExistingCustomer, setSelectedExistingCustomer] = useState(null);

  // New Sale State - UPDATED WITH SALES_NOTE
  const [saleData, setSaleData] = useState({
    branch_name: '',
    payment_type: 'cash',
    customer_name: '',
    customer_phone: '',
    vat_enabled: false,
    vat_percentage: 7.5,
    sales_note: '',
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
    loadCreditCustomers();
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

  const loadCreditCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE}/credit-customers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCreditCustomers(data.customers || []);
    } catch (err) {
      console.error('Error loading credit customers:', err);
    }
  };

  const filteredCustomers = creditCustomers.filter(c => 
    c.customer_type !== 'bulk_reseller' && (
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.contact_info.includes(customerSearch)
    )
  );

  const selectExistingCustomer = (customer) => {
    setSelectedExistingCustomer(customer);
    setSaleData({
      ...saleData,
      customer_name: customer.name,
      customer_phone: customer.contact_info
    });
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const clearSelectedCustomer = () => {
    setSelectedExistingCustomer(null);
    setSaleData({
      ...saleData,
      customer_name: '',
      customer_phone: ''
    });
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
        sales_note: saleData.sales_note || null,
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
      sales_note: '',
      items: [{ serial_number: '', price: '', ram_price: '', storage_price: '' }]
    });
    setSaleSuccess(null);
    setSaleError('');
    setSelectedExistingCustomer(null);
    setCustomerSearch('');
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

  // New Sale Form View - UPDATED WITH SALES_NOTE
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

              {saleData.payment_type === 'credit' && !selectedExistingCustomer && (
                <div className="form-group">
                  <label>Search Existing Credit Customer (Optional)</label>
                  <div className="customer-search-container">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder="Type to search existing customers by name or phone..."
                    />
                    {showCustomerDropdown && customerSearch && (
                      <div className="customer-dropdown">
                        {filteredCustomers.length === 0 ? (
                          <div className="dropdown-item no-results">
                            No existing customers found. Enter details below for new customer.
                          </div>
                        ) : (
                          filteredCustomers.slice(0, 10).map(customer => (
                            <div 
                              key={customer.id} 
                              className="dropdown-item"
                              onClick={() => selectExistingCustomer(customer)}
                            >
                              <span className="customer-name">{customer.name}</span>
                              <span className="customer-phone">{customer.contact_info}</span>
                              <span className="customer-balance">
                                Balance: ₦{parseFloat(customer.open_balance || 0).toLocaleString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedExistingCustomer && saleData.payment_type === 'credit' && (
                <div className="selected-customer-card">
                  <div className="selected-customer-info">
                    <strong>{selectedExistingCustomer.name}</strong>
                    <span>{selectedExistingCustomer.contact_info}</span>
                    <span className="existing-balance">
                      Current Balance: ₦{parseFloat(selectedExistingCustomer.open_balance || 0).toLocaleString()}
                    </span>
                  </div>
                  <button type="button" className="btn small secondary" onClick={clearSelectedCustomer}>
                    Change Customer
                  </button>
                </div>
              )}

              {(!selectedExistingCustomer || saleData.payment_type === 'cash') && (
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
              )}

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

              {/* NEW: Sales Note Field */}
              <div className="form-group">
                <label>Sales Note (Optional)</label>
                <textarea
                  value={saleData.sales_note}
                  onChange={(e) => setSaleData({...saleData, sales_note: e.target.value})}
                  placeholder="Any additional notes for this sale..."
                  rows="2"
                />
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
// CREDIT CUSTOMERS COMPONENT - UPDATED WITH SPECIFICATIONS
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

  // Selected Sale Details for showing specs
  const [selectedSaleDetails, setSelectedSaleDetails] = useState(null);

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

  // NEW: Handle sale selection to show specs
  const handleSaleSelection = (saleId) => {
    setPaymentData({...paymentData, sale_id: saleId});
    
    // Find the selected sale to show its details
    const sale = customerDebts?.unsettled_sales?.find(s => s.sale_id === parseInt(saleId));
    setSelectedSaleDetails(sale || null);
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
      setSelectedSaleDetails(null);
      
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

  // Customer Details View - UPDATED WITH SPECIFICATIONS
  if (view === 'details' && selectedCustomer) {
    return (
      <div className="credit-customers">
        <div className="page-header">
          <h2>Customer Details</h2>
          <button className="btn secondary" onClick={() => { setView('list'); setSelectedCustomer(null); setCustomerDebts(null); setSelectedSaleDetails(null); }}>
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

            {/* Admin: Recalculate Balance Section */}
            {user?.role === 'admin' && (
              <div className="section">
                <h3>Balance Management (Admin)</h3>
                <p style={{fontSize: '13px', color: '#666', marginBottom: '12px'}}>
                  If the balance appears incorrect, click below to recalculate based on unsettled sales.
                </p>
                <button 
                  className="btn secondary"
                  onClick={async () => {
                    if (!window.confirm('Recalculate this customer\'s balance based on their unsettled sales?')) return;
                    try {
                      const res = await fetch(`${API_BASE}/credit-customers/${selectedCustomer.contact_info}/recalculate-balance`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error);
                      alert(`Balance recalculated!\n\nPrevious: ₦${data.previous_balance.toLocaleString()}\nCorrect Balance: ₦${data.correct_balance.toLocaleString()}\nDifference: ₦${data.difference.toLocaleString()}`);
                      loadCustomerDebts(selectedCustomer.contact_info);
                      loadCustomers();
                    } catch (err) {
                      alert('Error: ' + err.message);
                    }
                  }}
                >
                  🔄 Recalculate Balance
                </button>
              </div>
            )}

            <div className="section">
              <h3>Record Payment</h3>
              
              {paymentMessage && (
                <div className={paymentMessage.startsWith('✓') ? 'success-message' : 'error-message'}>
                  {paymentMessage}
                </div>
              )}

              <form onSubmit={handlePayment} className="payment-form">
                <div className="form-group">
                  <label>Sale ID *</label>
                  <select
                    value={paymentData.sale_id}
                    onChange={(e) => handleSaleSelection(e.target.value)}
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

                {/* NEW: Show selected sale details with specs */}
                {selectedSaleDetails && (
                  <div className="selected-sale-details">
                    <h4>Sale #{selectedSaleDetails.sale_id} Items:</h4>
                    {selectedSaleDetails.items?.map((item, idx) => (
                      <div key={idx} className="sale-item-detail">
                        <strong>{item.product_name}</strong>
                        <span className="serial-number">S/N: {item.serial_number}</span>
                        {item.specifications && (
                          <span className="specs">Specs: {item.specifications}</span>
                        )}
                        <span className="price">₦{parseFloat(item.price).toLocaleString()}</span>
                      </div>
                    ))}
                    {selectedSaleDetails.sales_note && (
                      <div className="sale-note">
                        <strong>Note:</strong> {selectedSaleDetails.sales_note}
                      </div>
                    )}
                  </div>
                )}

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
                              <div className="debt-item-main">
                                <span className="product-name">{item.product_name}</span>
                                <span>₦{parseFloat(item.price).toLocaleString()}</span>
                              </div>
                              {item.specifications && (
                                <div className="debt-item-specs">
                                  <small>Specs: {item.specifications}</small>
                                </div>
                              )}
                              <div className="debt-item-serial">
                                <small>S/N: {item.serial_number}</small>
                              </div>
                            </div>
                          ))}
                        </div>
                        {sale.sales_note && (
                          <div className="sale-note-display">
                            <strong>Note:</strong> {sale.sales_note}
                          </div>
                        )}
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
// BULK RESELLERS COMPONENT - UPDATED WITH DELETE AND RETURN FEATURES
// =============================================================================
function BulkResellers({ token, user }) {
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [selectedReseller, setSelectedReseller] = useState(null);
  const [creditBook, setCreditBook] = useState(null);
  const [branches, setBranches] = useState([]);

  // Create Reseller State (Admin Only)
  const [newReseller, setNewReseller] = useState({ name: '', contact_info: '' });
  const [createMessage, setCreateMessage] = useState('');

  // Add Laptops State
  const [addLaptopsData, setAddLaptopsData] = useState({
    branch_name: '',
    items: [{ serial_number: '', given_price: '' }]
  });
  const [addLaptopsMessage, setAddLaptopsMessage] = useState('');

  // Return Laptop State (NEW)
  const [returnData, setReturnData] = useState({ serial_number: '' });
  const [returnMessage, setReturnMessage] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  // Payment State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');

  useEffect(() => {
    loadResellers();
    loadBranches();
  }, []);

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

  const loadCreditBook = async (resellerId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bulk-resellers/${resellerId}/credit-book`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setCreditBook(data);
      setSelectedReseller(data.reseller);
      setView('details');
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
        body: JSON.stringify(newReseller)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create reseller');
      }

      setCreateMessage(`✓ ${data.message}`);
      setNewReseller({ name: '', contact_info: '' });
      loadResellers();

    } catch (err) {
      setCreateMessage(`✗ Error: ${err.message}`);
    }
  };

  // NEW: Delete Reseller (Admin Only)
  const handleDeleteReseller = async (resellerId, resellerName) => {
    if (!window.confirm(`Are you sure you want to delete "${resellerName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/bulk-resellers/${resellerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete reseller');
      }

      alert(`✓ ${data.message}`);
      loadResellers();

    } catch (err) {
      alert(`✗ Error: ${err.message}`);
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
            given_price: parseFloat(item.given_price) || 0
          }))
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add laptops');
      }

      setAddLaptopsMessage(`✓ ${data.message}`);
      setAddLaptopsData({
        branch_name: '',
        items: [{ serial_number: '', given_price: '' }]
      });
      loadCreditBook(selectedReseller.id);
      loadResellers();

    } catch (err) {
      setAddLaptopsMessage(`✗ Error: ${err.message}`);
    }
  };

  // NEW: Return Laptop from Bulk Reseller
  const handleReturnLaptop = async (e) => {
    e.preventDefault();
    setReturnMessage('');
    setReturnLoading(true);

    try {
      const res = await fetch(`${API_BASE}/bulk-resellers/${selectedReseller.id}/return-laptop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ serial_number: returnData.serial_number })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to return laptop');
      }

      setReturnMessage(`✓ ${data.message} - Amount reduced: ₦${parseFloat(data.amount_reduced).toLocaleString()}`);
      setReturnData({ serial_number: '' });
      loadCreditBook(selectedReseller.id);
      loadResellers();

    } catch (err) {
      setReturnMessage(`✗ Error: ${err.message}`);
    } finally {
      setReturnLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
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
        throw new Error(data.error || 'Failed to record payment');
      }

      setPaymentMessage(`✓ Payment of ₦${parseFloat(data.amount_paid).toLocaleString()} recorded!`);
      setPaymentAmount('');
      loadCreditBook(selectedReseller.id);
      loadResellers();

      if (data.receipt_url) {
        window.open(`${API_BASE}${data.receipt_url}`, '_blank');
      }

    } catch (err) {
      setPaymentMessage(`✗ Error: ${err.message}`);
    }
  };

  // Create Reseller View (Admin Only)
  if (view === 'create' && user?.role === 'admin') {
    return (
      <div className="bulk-resellers">
        <div className="page-header">
          <h2>Create Bulk Reseller</h2>
          <button className="btn secondary" onClick={() => setView('list')}>
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
                value={newReseller.name}
                onChange={(e) => setNewReseller({...newReseller, name: e.target.value})}
                placeholder="Enter business/reseller name"
                required
              />
            </div>

            <div className="form-group">
              <label>Contact Phone *</label>
              <input
                type="text"
                value={newReseller.contact_info}
                onChange={(e) => setNewReseller({...newReseller, contact_info: e.target.value})}
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

  // Reseller Details View - UPDATED WITH RETURN FEATURE
  if (view === 'details' && selectedReseller) {
    return (
      <div className="bulk-resellers">
        <div className="page-header">
          <h2>{selectedReseller.name}</h2>
          <button className="btn secondary" onClick={() => { setView('list'); setSelectedReseller(null); setCreditBook(null); }}>
            ← Back to Resellers
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <>
            <div className="reseller-info-card">
              <div className="reseller-header">
                <div>
                  <h3>{selectedReseller.name}</h3>
                  <p>{selectedReseller.contact_info}</p>
                </div>
                <div className="reseller-balance">
                  <span className="balance-label">Total Owed</span>
                  <span className="balance-amount">₦{parseFloat(selectedReseller.open_balance || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Add Laptops Section */}
            <div className="section">
              <h3>Add Laptops to Credit Book</h3>
              
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

                {addLaptopsData.items.map((item, index) => (
                  <div key={index} className="item-row">
                    <div className="form-group">
                      <input
                        type="text"
                        value={item.serial_number}
                        onChange={(e) => updateLaptopItem(index, 'serial_number', e.target.value)}
                        placeholder="Serial Number"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <input
                        type="number"
                        value={item.given_price}
                        onChange={(e) => updateLaptopItem(index, 'given_price', e.target.value)}
                        placeholder="Given Price (₦)"
                        required
                      />
                    </div>
                    {addLaptopsData.items.length > 1 && (
                      <button type="button" className="btn small danger" onClick={() => removeLaptopItem(index)}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                <div className="form-actions">
                  <button type="button" className="btn small secondary" onClick={addLaptopItem}>
                    + Add Another
                  </button>
                  <button type="submit" className="btn primary">
                    Add to Credit Book
                  </button>
                </div>
              </form>
            </div>

            {/* NEW: Return Laptop Section */}
            <div className="section">
              <h3>Return Laptop from Credit Book</h3>
              
              {returnMessage && (
                <div className={returnMessage.startsWith('✓') ? 'success-message' : 'error-message'}>
                  {returnMessage}
                </div>
              )}

              <form onSubmit={handleReturnLaptop} className="inline-form">
                <div className="form-group">
                  <input
                    type="text"
                    value={returnData.serial_number}
                    onChange={(e) => setReturnData({ serial_number: e.target.value })}
                    placeholder="Enter serial number to return"
                    required
                  />
                </div>
                <button type="submit" className="btn primary" disabled={returnLoading}>
                  {returnLoading ? 'Returning...' : 'Return Laptop'}
                </button>
              </form>
              
              <div className="form-tip">
                <strong>💡 Note:</strong> Returning a laptop removes it from the credit book, 
                restores it to inventory, and reduces the amount owed.
              </div>
            </div>

            {/* Admin: Recalculate Balance Section */}
            {user?.role === 'admin' && (
              <div className="section">
                <h3>Balance Management (Admin)</h3>
                <p style={{fontSize: '13px', color: '#666', marginBottom: '12px'}}>
                  If the balance appears incorrect, click below to recalculate based on credit book items and payments.
                </p>
                <button 
                  className="btn secondary"
                  onClick={async () => {
                    if (!window.confirm('Recalculate this reseller\'s balance based on their credit book and payments?')) return;
                    try {
                      const res = await fetch(`${API_BASE}/bulk-resellers/${selectedReseller.id}/recalculate-balance`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error);
                      alert(`Balance recalculated!\n\nPrevious: ₦${data.previous_balance.toLocaleString()}\nItems Total: ₦${data.items_total.toLocaleString()}\nPayments: ₦${data.payments_total.toLocaleString()}\nCorrect Balance: ₦${data.correct_balance.toLocaleString()}`);
                      loadCreditBook(selectedReseller.id);
                      loadResellers();
                    } catch (err) {
                      alert('Error: ' + err.message);
                    }
                  }}
                >
                  🔄 Recalculate Balance
                </button>
              </div>
            )}

            {/* Payment Section */}
            <div className="section">
              <h3>Record Payment</h3>
              
              {paymentMessage && (
                <div className={paymentMessage.startsWith('✓') ? 'success-message' : 'error-message'}>
                  {paymentMessage}
                </div>
              )}

              <form onSubmit={handlePayment} className="inline-form">
                <div className="form-group">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter payment amount (₦)"
                    required
                  />
                </div>
                <button type="submit" className="btn primary">
                  Record Payment
                </button>
              </form>
            </div>

            {/* Credit Book Items */}
            <div className="section">
              <h3>Credit Book ({creditBook?.total_items || 0} items)</h3>
              
              {creditBook?.items?.length === 0 ? (
                <div className="empty-state">No items in credit book.</div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Serial Number</th>
                        <th>Specifications</th>
                        <th>Given Price</th>
                        <th>Date Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creditBook?.items?.map(item => (
                        <tr key={item.id}>
                          <td className="product-name">{item.product_name}</td>
                          <td className="serial-number">{item.serial_number}</td>
                          <td>{item.specifications || '-'}</td>
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

  // Resellers List View - UPDATED WITH DELETE BUTTON
  return (
    <div className="bulk-resellers">
      <div className="page-header">
        <h2>Bulk Resellers</h2>
        {user?.role === 'admin' && (
          <button className="btn primary" onClick={() => setView('create')}>
            + New Reseller
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
                <th>Open Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resellers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    No bulk resellers yet. {user?.role === 'admin' ? 'Click "New Reseller" to add one.' : 'Contact admin to add resellers.'}
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
                    <td className="action-buttons">
                      <button 
                        className="btn small primary"
                        onClick={() => loadCreditBook(reseller.id)}
                      >
                        View Details
                      </button>
                      {user?.role === 'admin' && (
                        <button 
                          className="btn small danger"
                          onClick={() => handleDeleteReseller(reseller.id, reseller.name)}
                        >
                          Delete
                        </button>
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
// REPORTS COMPONENT - UPDATED WITH SALES_NOTE
// =============================================================================
function Reports({ token, user }) {
  const [reportType, setReportType] = useState('daily');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  // Custom filters
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Credit payments report data
  const [creditPaymentsData, setCreditPaymentsData] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadBranches();
    }
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

  const generateReport = async () => {
    setLoading(true);
    setReportData(null);
    setCreditPaymentsData(null);

    try {
      let url = `${API_BASE}/reports/${reportType}`;
      const params = new URLSearchParams();

      if (selectedBranch) {
        params.append('branch_name', selectedBranch);
      }

      if (reportType === 'monthly') {
        params.append('month', month);
        params.append('year', year);
      } else if (reportType === 'yearly') {
        params.append('year', year);
      } else if (reportType === 'custom' || reportType === 'credit-payments') {
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate report');
      }

      if (reportType === 'credit-payments') {
        setCreditPaymentsData(data);
      } else {
        setReportData(data);
      }

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = (paymentType, paymentId) => {
    if (paymentType === 'credit_customer') {
      window.open(`${API_BASE}/receipt/credit-payment/${paymentId}`, '_blank');
    } else if (paymentType === 'bulk_reseller') {
      window.open(`${API_BASE}/receipt/bulk-reseller-payment/${paymentId}`, '_blank');
    }
  };

  const printSaleReceipt = (saleId, paymentType) => {
    if (paymentType === 'cash') {
      window.open(`${API_BASE}/receipt/sale/${saleId}`, '_blank');
    }
  };

  return (
    <div className="reports">
      <h2>Reports</h2>

      <div className="report-controls">
        <div className="form-group">
          <label>Report Type</label>
          <select value={reportType} onChange={(e) => { setReportType(e.target.value); setReportData(null); setCreditPaymentsData(null); }}>
            <option value="daily">Daily Sales Report</option>
            <option value="weekly">Weekly Sales Report</option>
            <option value="monthly">Monthly Sales Report</option>
            <option value="yearly">Yearly Sales Report</option>
            <option value="custom">Custom Date Range Sales</option>
            <option value="credit-payments">Credit Payments Report</option>
          </select>
        </div>

        {user?.role === 'admin' && (
          <div className="form-group">
            <label>Branch Filter</label>
            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {reportType === 'monthly' && (
          <>
            <div className="form-group">
              <label>Month</label>
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                min="2020"
                max="2030"
              />
            </div>
          </>
        )}

        {reportType === 'yearly' && (
          <div className="form-group">
            <label>Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              min="2020"
              max="2030"
            />
          </div>
        )}

        {(reportType === 'custom' || reportType === 'credit-payments') && (
          <>
            <div className="form-group">
              <label>Start Date {reportType === 'credit-payments' && '(Optional)'}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required={reportType === 'custom'}
              />
            </div>
            <div className="form-group">
              <label>End Date {reportType === 'credit-payments' && '(Optional)'}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required={reportType === 'custom'}
              />
            </div>
          </>
        )}

        <button className="btn primary" onClick={generateReport} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {/* Credit Payments Report Results */}
      {creditPaymentsData && (
        <div className="report-results">
          <div className="report-summary">
            <div className="summary-card">
              <h4>Total Payments</h4>
              <p>{creditPaymentsData.totals?.total_payments || 0}</p>
            </div>
            <div className="summary-card">
              <h4>Total Amount</h4>
              <p>₦{(creditPaymentsData.totals?.total_amount || 0).toLocaleString()}</p>
            </div>
            <div className="summary-card">
              <h4>Credit Customer</h4>
              <p>₦{(creditPaymentsData.totals?.credit_customer_amount || 0).toLocaleString()}</p>
            </div>
            <div className="summary-card">
              <h4>Bulk Reseller</h4>
              <p>₦{(creditPaymentsData.totals?.bulk_reseller_amount || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Payment ID</th>
                  <th>Customer/Reseller</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {creditPaymentsData.payments?.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      No credit payments found for this period.
                    </td>
                  </tr>
                ) : (
                  creditPaymentsData.payments?.map((payment, idx) => (
                    <tr key={idx}>
                      <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td>#{payment.payment_id}</td>
                      <td className="customer-name">{payment.customer_name}</td>
                      <td>{payment.customer_phone}</td>
                      <td>
                        <span className={`type-badge ${payment.payment_type === 'credit_customer' ? 'credit' : 'cash'}`}>
                          {payment.payment_type === 'credit_customer' ? 'Credit Customer' : 'Bulk Reseller'}
                        </span>
                      </td>
                      <td className="profit">₦{parseFloat(payment.amount).toLocaleString()}</td>
                      <td>
                        <button 
                          className="btn small primary"
                          onClick={() => printReceipt(payment.payment_type, payment.payment_id)}
                        >
                          🖨 Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportData && (
        <div className="report-results">
          <div className="report-summary">
            <div className="summary-card">
              <h4>Total Sales</h4>
              <p>{reportData.sales?.length || 0}</p>
            </div>
            <div className="summary-card">
              <h4>Total Revenue</h4>
              <p>₦{(reportData.totals?.total_revenue || 0).toLocaleString()}</p>
            </div>
            <div className="summary-card">
              <h4>Total Cost</h4>
              <p>₦{(reportData.totals?.total_cost || 0).toLocaleString()}</p>
            </div>
            <div className="summary-card profit">
              <h4>Total Profit</h4>
              <p>₦{(reportData.totals?.total_profit || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sale ID</th>
                  <th>Product</th>
                  <th>Serial Number</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Sale Price</th>
                  <th>Profit</th>
                  {user?.role === 'admin' && <th>Branch</th>}
                  <th>Note</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {reportData.sales?.length === 0 ? (
                  <tr>
                    <td colSpan={user?.role === 'admin' ? 11 : 10} className="empty-state">
                      No sales found for this period.
                    </td>
                  </tr>
                ) : (
                  reportData.sales?.map((sale, idx) => (
                    <tr key={idx}>
                      <td>{new Date(sale.created_at).toLocaleDateString()}</td>
                      <td>#{sale.sale_id}</td>
                      <td className="product-name">{sale.product_name}</td>
                      <td className="serial-number">{sale.serial_number}</td>
                      <td>{sale.customer_name}</td>
                      <td>
                        <span className={`type-badge ${sale.payment_type}`}>
                          {sale.payment_type}
                        </span>
                      </td>
                      <td>₦{parseFloat(sale.sale_price).toLocaleString()}</td>
                      <td className="profit">₦{parseFloat(sale.profit).toLocaleString()}</td>
                      {user?.role === 'admin' && <td>{sale.branch_name}</td>}
                      <td className="note-cell">{sale.sales_note || '-'}</td>
                      <td>
                        {sale.payment_type === 'cash' && (
                          <button 
                            className="btn small primary"
                            onClick={() => printSaleReceipt(sale.sale_id, sale.payment_type)}
                          >
                            🖨
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

  // New Report State
  const [newReport, setNewReport] = useState({
    supplier_name: '',
    total_supplied: '',
    good_units: '',
    faults: [{ type: '', description: '', count: '' }],
    notes: ''
  });

  // Predefined fault options
  const faultOptions = [
    'Screen Issue',
    'Keyboard Issue', 
    'Battery Issue',
    'Charging Port Issue',
    'Motherboard Issue',
    'RAM Issue',
    'Storage Issue',
    'Hinge Issue',
    'Speaker Issue',
    'Camera Issue',
    'WiFi/Bluetooth Issue',
    'Physical Damage',
    'Other'
  ];

  const [createMessage, setCreateMessage] = useState('');

  useEffect(() => {
    loadReports();
    loadSuppliers();
  }, []);

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

  const addFault = () => {
    setNewReport({
      ...newReport,
      faults: [...newReport.faults, { type: '', description: '', count: '' }]
    });
  };

  const removeFault = (index) => {
    if (newReport.faults.length === 1) return;
    const newFaults = newReport.faults.filter((_, i) => i !== index);
    setNewReport({ ...newReport, faults: newFaults });
  };

  const updateFault = (index, field, value) => {
    const newFaults = [...newReport.faults];
    newFaults[index][field] = value;
    // Clear description if type is not 'Other'
    if (field === 'type' && value !== 'Other') {
      newFaults[index].description = value;
    }
    setNewReport({ ...newReport, faults: newFaults });
  };

  const handleCreateReport = async (e) => {
    e.preventDefault();
    setCreateMessage('');

    try {
      const res = await fetch(`${API_BASE}/supplier-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newReport,
          total_supplied: parseInt(newReport.total_supplied),
          good_units: parseInt(newReport.good_units),
          faults: newReport.faults.map(f => ({
            description: f.type === 'Other' ? f.description : f.type,
            count: parseInt(f.count) || 0
          }))
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create report');
      }

      setCreateMessage(`✓ Report created successfully!`);
      setNewReport({
        supplier_name: '',
        total_supplied: '',
        good_units: '',
        faults: [{ description: '', count: '' }],
        notes: ''
      });
      loadReports();

    } catch (err) {
      setCreateMessage(`✗ Error: ${err.message}`);
    }
  };

  // Create Report View
  if (view === 'create') {
    return (
      <div className="supplier-reports">
        <div className="page-header">
          <h2>New Supplier Report</h2>
          <button className="btn secondary" onClick={() => setView('list')}>
            ← Back
          </button>
        </div>

        <div className="form-container">
          {createMessage && (
            <div className={createMessage.startsWith('✓') ? 'success-message' : 'error-message'}>
              {createMessage}
            </div>
          )}

          <form onSubmit={handleCreateReport}>
            <div className="form-group">
              <label>Supplier *</label>
              <select
                value={newReport.supplier_name}
                onChange={(e) => setNewReport({...newReport, supplier_name: e.target.value})}
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
                  value={newReport.total_supplied}
                  onChange={(e) => setNewReport({...newReport, total_supplied: e.target.value})}
                  placeholder="e.g., 50"
                  required
                />
              </div>

              <div className="form-group">
                <label>Good Units *</label>
                <input
                  type="number"
                  value={newReport.good_units}
                  onChange={(e) => setNewReport({...newReport, good_units: e.target.value})}
                  placeholder="e.g., 45"
                  required
                />
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <h3>Fault Breakdown</h3>
                <button type="button" className="btn small secondary" onClick={addFault}>
                  + Add Fault Type
                </button>
              </div>

              {newReport.faults.map((fault, index) => (
                <div key={index} className="fault-row">
                  <div className="form-group">
                    <label>Fault Type</label>
                    <select
                      value={fault.type}
                      onChange={(e) => updateFault(index, 'type', e.target.value)}
                      required
                    >
                      <option value="">Select Fault Type</option>
                      {faultOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  {fault.type === 'Other' && (
                    <div className="form-group">
                      <label>Describe Fault</label>
                      <input
                        type="text"
                        value={fault.description}
                        onChange={(e) => updateFault(index, 'description', e.target.value)}
                        placeholder="Describe the fault"
                        required
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Count</label>
                    <input
                      type="number"
                      value={fault.count}
                      onChange={(e) => updateFault(index, 'count', e.target.value)}
                      placeholder="Number of units"
                      required
                    />
                  </div>
                  {newReport.faults.length > 1 && (
                    <button type="button" className="btn small danger" onClick={() => removeFault(index)}>
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={newReport.notes}
                onChange={(e) => setNewReport({...newReport, notes: e.target.value})}
                placeholder="Any additional notes..."
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
            ← Back
          </button>
        </div>

        <div className="report-details-card">
          <div className="detail-row">
            <span className="label">Supplier:</span>
            <span className="value">{selectedReport.supplier_name}</span>
          </div>
          <div className="detail-row">
            <span className="label">Date:</span>
            <span className="value">{new Date(selectedReport.created_at).toLocaleString()}</span>
          </div>
          <div className="detail-row">
            <span className="label">Reported By:</span>
            <span className="value">{selectedReport.reported_by}</span>
          </div>

          <div className="stats-row">
            <div className="stat">
              <span className="stat-value">{selectedReport.total_supplied}</span>
              <span className="stat-label">Total Supplied</span>
            </div>
            <div className="stat good">
              <span className="stat-value">{selectedReport.good_units}</span>
              <span className="stat-label">Good Units</span>
            </div>
            <div className="stat bad">
              <span className="stat-value">{selectedReport.total_faulty}</span>
              <span className="stat-label">Faulty Units</span>
            </div>
          </div>

          {faults && faults.length > 0 && (
            <div className="faults-section">
              <h4>Fault Breakdown</h4>
              <ul>
                {faults.map((fault, idx) => (
                  <li key={idx}>
                    <span className="fault-desc">{fault.description}</span>
                    <span className="fault-count">{fault.count} unit(s)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedReport.notes && (
            <div className="notes-section">
              <h4>Notes</h4>
              <p>{selectedReport.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Reports List View
  return (
    <div className="supplier-reports">
      <div className="page-header">
        <h2>Supplier Reports</h2>
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
                <th>Good Units</th>
                <th>Faulty Units</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No supplier reports yet. Click "New Report" to create one.
                  </td>
                </tr>
              ) : (
                reports.map(report => (
                  <tr key={report.id}>
                    <td>{new Date(report.created_at).toLocaleDateString()}</td>
                    <td>{report.supplier_name}</td>
                    <td>{report.total_supplied}</td>
                    <td className="good">{report.good_units}</td>
                    <td className="bad">{report.total_faulty}</td>
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
// =============================================================================
// SETTINGS COMPONENT (Admin Only) - FIXED
// =============================================================================
function Settings({ token, user }) {
  const [view, setView] = useState('menu');
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'sales', branch_name: '' });
  const [newBranch, setNewBranch] = useState({ name: '', location: '' });
  const [newSupplier, setNewSupplier] = useState({ name: '', contact_info: '' });
  const [message, setMessage] = useState('');

  // Load data when view changes
  useEffect(() => {
    setMessage('');
    if (view === 'users') {
      loadUsers();
      loadBranches();
    } else if (view === 'branches') {
      loadBranches();
    } else if (view === 'suppliers') {
      loadSuppliers();
    }
  }, [view]);

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

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setMessage(`✓ User "${newUser.name}" created successfully!`);
      setNewUser({ name: '', email: '', password: '', role: 'sales', branch_name: '' });
      loadUsers();

    } catch (err) {
      setMessage(`✗ Error: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setMessage(`✓ User "${userName}" deleted successfully`);
      loadUsers();

    } catch (err) {
      setMessage(`✗ Error: ${err.message}`);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch(`${API_BASE}/branch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newBranch)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create branch');
      }

      setMessage(`✓ Branch "${newBranch.name}" created successfully!`);
      setNewBranch({ name: '', location: '' });
      loadBranches();

    } catch (err) {
      setMessage(`✗ Error: ${err.message}`);
    }
  };

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch(`${API_BASE}/supplier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSupplier)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create supplier');
      }

      setMessage(`✓ Supplier "${newSupplier.name}" created successfully!`);
      setNewSupplier({ name: '', contact_info: '' });
      loadSuppliers();

    } catch (err) {
      setMessage(`✗ Error: ${err.message}`);
    }
  };

  // Users Management View
  if (view === 'users') {
    return (
      <div className="settings">
        <div className="page-header">
          <h2>User Management</h2>
          <button className="btn secondary" onClick={() => setView('menu')}>
            ← Back
          </button>
        </div>

        <div className="form-container">
          <h3>Add New User</h3>
          
          {message && (
            <div className={message.startsWith('✓') ? 'success-message' : 'error-message'}>
              {message}
            </div>
          )}

          <form onSubmit={handleCreateUser}>
            <div className="form-row">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="Enter password"
                  required
                />
              </div>

              <div className="form-group">
                <label>Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  required
                >
                  <option value="sales">Sales</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {newUser.role === 'sales' && (
              <div className="form-group">
                <label>Branch *</label>
                <select
                  value={newUser.branch_name}
                  onChange={(e) => setNewUser({...newUser, branch_name: e.target.value})}
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

        <div className="section">
          <h3>Existing Users</h3>
          
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-state">No users found.</td>
                    </tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`role-badge ${u.role}`}>{u.role}</span>
                        </td>
                        <td>{u.branch_name || '-'}</td>
                        <td>
                          {u.id !== user.id && (
                            <button 
                              className="btn small danger"
                              onClick={() => handleDeleteUser(u.id, u.name)}
                            >
                              Delete
                            </button>
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
      </div>
    );
  }

  // Branches Management View
  if (view === 'branches') {
    return (
      <div className="settings">
        <div className="page-header">
          <h2>Branch Management</h2>
          <button className="btn secondary" onClick={() => setView('menu')}>
            ← Back
          </button>
        </div>

        <div className="form-container">
          <h3>Add New Branch</h3>
          
          {message && (
            <div className={message.startsWith('✓') ? 'success-message' : 'error-message'}>
              {message}
            </div>
          )}

          <form onSubmit={handleCreateBranch}>
            <div className="form-row">
              <div className="form-group">
                <label>Branch Name *</label>
                <input
                  type="text"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({...newBranch, name: e.target.value})}
                  placeholder="e.g., Computer Village"
                  required
                />
              </div>

              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  value={newBranch.location}
                  onChange={(e) => setNewBranch({...newBranch, location: e.target.value})}
                  placeholder="e.g., Lagos, Nigeria"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn primary">
              Create Branch
            </button>
          </form>
        </div>

        <div className="section">
          <h3>Existing Branches</h3>
          
          {loading ? (
            <div className="loading">Loading branches...</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="empty-state">No branches found.</td>
                    </tr>
                  ) : (
                    branches.map(b => (
                      <tr key={b.id}>
                        <td>{b.name}</td>
                        <td>{b.location}</td>
                        <td>{new Date(b.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Suppliers Management View
  if (view === 'suppliers') {
    return (
      <div className="settings">
        <div className="page-header">
          <h2>Supplier Management</h2>
          <button className="btn secondary" onClick={() => setView('menu')}>
            ← Back
          </button>
        </div>

        <div className="form-container">
          <h3>Add New Supplier</h3>
          
          {message && (
            <div className={message.startsWith('✓') ? 'success-message' : 'error-message'}>
              {message}
            </div>
          )}

          <form onSubmit={handleCreateSupplier}>
            <div className="form-row">
              <div className="form-group">
                <label>Supplier Name *</label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                  placeholder="e.g., Tech Suppliers Ltd"
                  required
                />
              </div>

              <div className="form-group">
                <label>Contact Info *</label>
                <input
                  type="text"
                  value={newSupplier.contact_info}
                  onChange={(e) => setNewSupplier({...newSupplier, contact_info: e.target.value})}
                  placeholder="e.g., 08012345678"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn primary">
              Add Supplier
            </button>
          </form>
        </div>

        <div className="section">
          <h3>Existing Suppliers</h3>
          
          {loading ? (
            <div className="loading">Loading suppliers...</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact Info</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="empty-state">No suppliers found.</td>
                    </tr>
                  ) : (
                    suppliers.map(s => (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        <td>{s.contact_info}</td>
                        <td>{new Date(s.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Settings Menu View (Default)
  return (
    <div className="settings">
      <h2>Settings</h2>
      
      <div className="menu-grid">
        <div className="menu-card" onClick={() => setView('users')}>
          <div className="menu-icon">👤</div>
          <h3>User Management</h3>
          <p>Add, edit, or remove users</p>
        </div>

        <div className="menu-card" onClick={() => setView('branches')}>
          <div className="menu-icon">🏢</div>
          <h3>Branch Management</h3>
          <p>Manage store branches</p>
        </div>

        <div className="menu-card" onClick={() => setView('suppliers')}>
          <div className="menu-icon">📦</div>
          <h3>Supplier Management</h3>
          <p>Manage laptop suppliers</p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================
export default App;