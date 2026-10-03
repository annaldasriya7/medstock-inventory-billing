import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Activity,
  Search,
  Filter,
  RefreshCw,
  X,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  UserCheck,
  KeyRound
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AdminResetPasswordModal from '../components/staff/AdminResetPasswordModal';

const StaffManagementPage = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('activity'); // 'members' or 'activity'
  const [staffList, setStaffList] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Audit Log
  const [searchLog, setSearchLog] = useState('');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('All');
  const [selectedActionFilter, setSelectedActionFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [resetPasswordStaff, setResetPasswordStaff] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  // Add/Edit Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
    phone: '',
    isActive: true
  });

  const fetchStaffMembers = async () => {
    try {
      if (isAdmin) {
        const res = await api.getUsers();
        setStaffList(res.users || []);
      }
    } catch (err) {
      console.error('Error fetching staff list:', err);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchLog) params.append('search', searchLog);
      if (selectedStaffFilter !== 'All') params.append('staffId', selectedStaffFilter);
      if (selectedActionFilter !== 'All') params.append('actionType', selectedActionFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.getStaffActivity(params.toString());
      setActivityLogs(res.logs || []);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchStaffMembers();
    }
    fetchActivityLogs();
  }, [selectedStaffFilter, selectedActionFilter, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchActivityLogs();
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'staff',
      phone: '',
      isActive: true
    });
    setEditingStaff(null);
    setFeedbackMsg({ type: '', text: '' });
    setIsAddModalOpen(true);
  };

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      password: '',
      role: staff.role,
      phone: staff.phone || '',
      isActive: staff.isActive !== false
    });
    setFeedbackMsg({ type: '', text: '' });
    setIsAddModalOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedbackMsg({ type: '', text: '' });

    try {
      if (editingStaff) {
        const payload = {
          name: formData.name,
          role: formData.role,
          phone: formData.phone,
          isActive: formData.isActive
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        await api.updateUser(editingStaff._id, payload);
        setFeedbackMsg({ type: 'success', text: 'Staff account updated successfully.' });
      } else {
        await api.createUser(formData);
        setFeedbackMsg({ type: 'success', text: 'New staff member added successfully.' });
      }

      fetchStaffMembers();
      fetchActivityLogs();
      setTimeout(() => {
        setIsAddModalOpen(false);
      }, 1000);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Operation failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-purple-100 text-purple-700 border border-purple-200">Admin</span>;
      case 'pharmacist':
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">Pharmacist</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-sky-100 text-sky-700 border border-sky-200">Staff</span>;
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'SALE_CREATED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Sale Created</span>;
      case 'STOCK_RECEIVED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">Stock Received</span>;
      case 'STOCK_ADJUSTED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200">Stock Adjusted</span>;
      case 'MEDICINE_QUARANTINED':
      case 'QUARANTINE_ACTION':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-50 text-rose-700 border border-rose-200">Quarantine Action</span>;
      case 'MEDICINE_CREATED':
      case 'MEDICINE_UPDATED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-200">Medicine Modified</span>;
      case 'BILL_REPRINTED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-50 text-purple-700 border border-purple-200">Bill Reprinted</span>;
      case 'MEDICINE_RETURNED':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-50 text-rose-700 border border-rose-200">Medicine Returned</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">{action}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff Management & Accountability</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-based pharmacy control, digital accountability tracking, and centralized staff audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'activity'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Staff Activity & Audit Trail</span>
          <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600 font-bold">
            {activityLogs.length}
          </span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'members'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Staff Accounts & Roles</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-600 font-bold">
              {staffList.length}
            </span>
          </button>
        )}
      </div>

      {/* Tab Content: Activity Logs */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff name, action description, invoice #..."
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </form>

            <div className="flex flex-wrap items-center gap-2">
              {/* Staff Filter */}
              <select
                value={selectedStaffFilter}
                onChange={(e) => setSelectedStaffFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700"
              >
                <option value="All">All Staff Members</option>
                {staffList.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>

              {/* Action Filter */}
              <select
                value={selectedActionFilter}
                onChange={(e) => setSelectedActionFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700"
              >
                <option value="All">All Actions</option>
                <option value="SALE_CREATED">Sale Created</option>
                <option value="STOCK_RECEIVED">Stock Received</option>
                <option value="STOCK_ADJUSTED">Stock Adjusted</option>
                <option value="MEDICINE_RETURNED">Medicine Returned</option>
                <option value="BILL_REPRINTED">Bill Reprinted</option>
                <option value="MEDICINE_QUARANTINED">Medicine Quarantined</option>
                <option value="QUARANTINE_ACTION">Quarantine Action</option>
                <option value="MEDICINE_CREATED">Medicine Created</option>
                <option value="STAFF_CREATED">Staff Created</option>
              </select>

              {/* Date Filters */}
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-600"
                title="Start Date"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-600"
                title="End Date"
              />

              <button
                onClick={fetchActivityLogs}
                className="p-2 text-slate-600 hover:text-emerald-600 bg-slate-50 border border-slate-200 rounded-xl"
                title="Refresh Logs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Activity Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-600" />
                <p className="text-xs">Loading staff audit log...</p>
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <Activity className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
                <p className="text-sm font-semibold text-slate-700">No Activity Recorded</p>
                <p className="text-xs text-slate-400">
                  Staff actions across sales, stock receiving, adjustments, and quarantine will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Staff Member</th>
                      <th className="px-4 py-3">Action Type</th>
                      <th className="px-4 py-3">Details / Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activityLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {new Date(log.date || log.createdAt).toLocaleDateString()}{' '}
                              {new Date(log.date || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{log.staffName}</span>
                            {getRoleBadge(log.role)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getActionBadge(log.actionType)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <p className="font-medium">{log.description}</p>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div className="mt-0.5 text-[11px] text-slate-500 font-mono flex flex-wrap gap-2">
                              {log.details.transactionNumber && (
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded">Inv: {log.details.transactionNumber}</span>
                              )}
                              {log.details.receiptNumber && (
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded">Receipt: {log.details.receiptNumber}</span>
                              )}
                              {log.details.adjustmentNumber && (
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded">Adj: {log.details.adjustmentNumber}</span>
                              )}
                              {log.details.batchNumber && (
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded">Batch: {log.details.batchNumber}</span>
                              )}
                            </div>
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
      )}

      {/* Tab Content: Staff Accounts (Admin Only) */}
      {activeTab === 'members' && isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Pharmacy Staff Roster</h3>
            <span className="text-xs text-slate-500">{staffList.length} Accounts Registered</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-4 py-3">Staff Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Registered On</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{s.name}</div>
                      <div className="text-[11px] text-slate-500">{s.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {getRoleBadge(s.role)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.phone || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          s.isActive !== false
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {s.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(s)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setResetPasswordStaff(s)}
                          className="px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors flex items-center gap-1"
                          title="Reset password and issue temporary credentials"
                        >
                          <KeyRound className="w-3 h-3 text-purple-600" />
                          <span>Reset Password</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingStaff ? `Edit Staff: ${editingStaff.name}` : 'Add New Staff Member'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-6 space-y-4">
              {feedbackMsg.text && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    feedbackMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {feedbackMsg.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Dr. Ananya Sharma"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  disabled={!!editingStaff}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="pharmacist@medstock.ai"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingStaff ? 'New Password (Leave blank to keep unchanged)' : 'Password'}
                </label>
                <input
                  type="password"
                  required={!editingStaff}
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700"
                  >
                    <option value="staff">Staff (Billing, Scan)</option>
                    <option value="pharmacist">Pharmacist (Stock, FEFO, Adjust)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {editingStaff && (
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <label htmlFor="isActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Account is Active and authorized to log in
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingStaff ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      <AdminResetPasswordModal
        isOpen={!!resetPasswordStaff}
        onClose={() => setResetPasswordStaff(null)}
        staff={resetPasswordStaff}
        onResetSuccess={() => {
          fetchStaffMembers();
          fetchActivityLogs();
        }}
      />
    </div>
  );
};

export default StaffManagementPage;

