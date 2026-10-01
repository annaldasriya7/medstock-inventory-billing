const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Universal fetch wrapper with automatic JWT injection and standardized error extraction
 */
const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('medstock_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = (data && data.message) || response.statusText || 'An error occurred during API request.';
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const api = {
  // Auth
  checkSetupStatus: () => request('/auth/setup-status'),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request('/auth/me'),

  // Medicines
  getMedicines: (params = '') => request(`/medicines${params ? `?${params}` : ''}`),
  getMedicineById: (id) => request(`/medicines/${id}`),
  createMedicine: (payload) => request('/medicines', { method: 'POST', body: JSON.stringify(payload) }),
  updateMedicine: (id, payload) => request(`/medicines/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteMedicine: (id) => request(`/medicines/${id}`, { method: 'DELETE' }),
  scanLookup: (code, branch) => request('/medicines/scan-lookup', { method: 'POST', body: JSON.stringify({ code, branch }) }),

  // Batches
  getBatches: (params = '') => request(`/batches${params ? `?${params}` : ''}`),
  createOrUpdateBatch: (payload) => request('/batches', { method: 'POST', body: JSON.stringify(payload) }),
  updateBatch: (id, payload) => request(`/batches/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteBatch: (id) => request(`/batches/${id}`, { method: 'DELETE' }),

  // Suppliers
  getSuppliers: (params = '') => request(`/suppliers${params ? `?${params}` : ''}`),
  createSupplier: (payload) => request('/suppliers', { method: 'POST', body: JSON.stringify(payload) }),
  updateSupplier: (id, payload) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSupplier: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),

  // Transactions / POS Billing
  previewFefo: (items, branchId) => request('/transactions/preview-fefo', { method: 'POST', body: JSON.stringify({ items, branchId }) }),
  createSale: (payload) => request('/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  getTransactions: (params = '') => request(`/transactions${params ? `?${params}` : ''}`),
  getTransactionById: (id) => request(`/transactions/${id}`),

  // Consumption
  getConsumption: (params = '') => request(`/consumption${params ? `?${params}` : ''}`),

  // Predictions & AI Forecasting
  getPredictions: (params = '') => request(`/predictions${params ? `?${params}` : ''}`),
  getSinglePrediction: (id, method) => request(`/predictions/${id}?method=${encodeURIComponent(method || 'Moving Average')}`),
  getHealthScore: (branchId) => request(`/predictions/health-score${branchId ? `?branchId=${branchId}` : ''}`),
  getAnomalies: () => request('/predictions/anomalies'),
  runSimulation: (payload) => request('/predictions/simulate', { method: 'POST', body: JSON.stringify(payload) }),

  // Alerts
  getAlerts: (params = '') => request(`/alerts${params ? `?${params}` : ''}`),
  syncAlerts: (branchId) => request('/alerts/sync', { method: 'POST', body: JSON.stringify({ branchId }) }),
  markAlertRead: (id) => request(`/alerts/${id}/read`, { method: 'PUT' }),
  markAllAlertsRead: () => request('/alerts/mark-all-read', { method: 'PUT' }),
  dismissAlert: (id) => request(`/alerts/${id}`, { method: 'DELETE' }),

  // Reports
  getSalesReport: (params = '') => request(`/reports/sales${params ? `?${params}` : ''}`),
  getConsumptionReport: (params = '') => request(`/reports/consumption${params ? `?${params}` : ''}`),
  getInventoryReport: (params = '') => request(`/reports/inventory${params ? `?${params}` : ''}`),
  getExpiryReport: (params = '') => request(`/reports/expiry${params ? `?${params}` : ''}`),
  getExportCsvUrl: (type, filter) => `${API_BASE}/reports/export-csv?type=${type}&filter=${filter}`,

  // AI Inventory Assistant
  askAssistant: (question) => request('/ai/ask', { method: 'POST', body: JSON.stringify({ question }) }),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (payload) => request('/settings', { method: 'PUT', body: JSON.stringify(payload) }),

  // Branches
  getBranches: () => request('/branches'),
  createBranch: (payload) => request('/branches', { method: 'POST', body: JSON.stringify(payload) }),
  getRedistributionSuggestions: () => request('/branches/redistribution'),

  // Users
  getUsers: () => request('/users'),
  createUser: (payload) => request('/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, payload) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
};
