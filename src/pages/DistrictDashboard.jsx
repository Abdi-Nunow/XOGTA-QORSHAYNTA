import { useState, useEffect } from 'react';
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { ref, push, serverTimestamp, onValue } from "firebase/database";
import {
    LayoutDashboard,
    Send,
    History,
    LogOut,
    Plus,
    Search,
    User,
    MapPin,
    FileText,
    DollarSign,
    Lock
} from 'lucide-react';
import { update, get } from 'firebase/database';
import { REVENUE_CATEGORIES } from '../lib/constants';



export default function DistrictDashboard() {
    const { logout, user } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');

    // Form State
    const [formData, setFormData] = useState({
        bookSerial: '',
        resource: '',
        dateOfWork: new Date().toISOString().split('T')[0],
        amount: '',
        model64Number: '',
        amount64: '',
        cashAmount: '',
        bankAmount: '',
        bankName: ''
    });

    const [submissions, setSubmissions] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Password Change State
    const [pwdData, setPwdData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [pwdLoading, setPwdLoading] = useState(false);

    // Monthly Performance Report State
    const [isAddingMonthlyReport, setIsAddingMonthlyReport] = useState(false);
    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [monthlyReportData, setMonthlyReportData] = useState({});
    const [existingMonthlyReports, setExistingMonthlyReports] = useState({});
    const [reportLoading, setReportLoading] = useState(false);

    const handleAmountChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({
            ...prev,
            amount: val,
            cashAmount: val,
            bankAmount: 0
        }));
    };

    const handlePaymentChange = (field, value) => {
        const total = parseFloat(formData.amount) || 0;
        const val = parseFloat(value) || 0;

        if (field === 'cashAmount') {
            const newBank = total - val;
            setFormData(prev => ({
                ...prev,
                cashAmount: value,
                bankAmount: newBank >= 0 ? newBank : 0
            }));
        } else if (field === 'bankAmount') {
            const newCash = total - val;
            setFormData(prev => ({
                ...prev,
                bankAmount: value,
                cashAmount: newCash >= 0 ? newCash : 0
            }));
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'model64Number' && value === '') {
            // If Model 64 is cleared, reset bank details and put all in cash
            const total = parseFloat(formData.amount) || 0;
            setFormData(prev => ({
                ...prev,
                [name]: value,
                bankName: '',
                bankAmount: 0,
                cashAmount: total
            }));
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const total = parseFloat(formData.amount);
        const cash = parseFloat(formData.cashAmount) || 0;
        const bank = parseFloat(formData.bankAmount) || 0;

        if (Math.abs(cash + bank - total) > 0.01) {
            setError(`Payment Mismatch! Cash + Bank must equal Total. (Diff: ${(cash + bank - total).toFixed(2)})`);
            return;
        }

        if (total <= 0) {
            setError("Amount must be greater than 0");
            return;
        }

        try {
            const submissionRef = ref(db, `submissions/${user.districtId}`);
            await push(submissionRef, {
                ...formData,
                amount: total,
                amount64: parseFloat(formData.amount64),
                cashAmount: cash,
                bankAmount: bank,
                submittedBy: user.username,
                districtId: user.districtId,
                zoneId: user.zoneId,
                districtName: user.name,
                timestamp: serverTimestamp(),
                paymentType: (cash > 0 && bank > 0) ? 'MIXED' : (cash > 0 ? 'CASH' : 'BANK')
            });
            setSuccess('Record submitted successfully!');
            setFormData({
                bookSerial: '',
                resource: '',
                dateOfWork: new Date().toISOString().split('T')[0],
                amount: '',
                model64Number: '',
                amount64: '',
                cashAmount: '',
                bankAmount: '',
                bankName: ''
            });
            setTimeout(() => setActiveTab('history'), 1000);
        } catch (err) {
            setError('Failed to submit: ' + err.message);
        }
    };

    useEffect(() => {
        if (!user?.districtId) return;
        const subRef = ref(db, `submissions/${user.districtId}`);
        const unsub = onValue(subRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.entries(data).map(([key, val]) => ({ id: key, ...val }));
                list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                setSubmissions(list);
            } else {
                setSubmissions([]);
            }
        });
        return () => unsub();
    }, [user]);

    useEffect(() => {
        if (!user?.districtId) return;
        const reportsRef = ref(db, `monthly_reports/${user.districtId}`);
        const unsub = onValue(reportsRef, (snapshot) => {
            const rawData = snapshot.val();
            if (rawData) {
                const formatted = {};
                Object.entries(rawData).forEach(([month, report]) => {
                    formatted[month] = { ...report, data: {} };
                    if (report.data && Array.isArray(report.data)) {
                        report.data.forEach(item => {
                            if (item.code) formatted[month].data[item.code] = item;
                        });
                    } else if (report.data) {
                        formatted[month].data = report.data;
                    }
                });
                setExistingMonthlyReports(formatted);
            } else {
                setExistingMonthlyReports({});
            }
        });
        return () => unsub();
    }, [user]);

    const handleMonthlyReportChange = (codeOrName, field, value) => {
        setMonthlyReportData(prev => ({
            ...prev,
            [codeOrName]: {
                ...prev[codeOrName],
                [field]: parseFloat(value) || 0
            }
        }));
    };

    const handleSaveMonthlyReport = async () => {
        if (!reportMonth) return;
        setReportLoading(true);
        try {
            const reportRef = ref(db, `monthly_reports/${user.districtId}/${reportMonth}`);
            const dataArray = Object.entries(monthlyReportData).map(([code, vals]) => ({
                code,
                ...vals
            }));

            await update(reportRef, {
                data: dataArray,
                updatedAt: serverTimestamp(),
                submittedBy: user.username,
                districtName: user.name,
                month: reportMonth
            });
            setSuccess(`Monthly report for ${reportMonth} saved successfully!`);
        } catch (err) {
            setError("Failed to save report: " + err.message);
        } finally {
            setReportLoading(false);
        }
    };

    const startNewReport = (month) => {
        setReportMonth(month || new Date().toISOString().slice(0, 7));
        setMonthlyReportData(existingMonthlyReports[month]?.data || {});
        setIsAddingMonthlyReport(true);
    };

    const recentSubmissions = submissions.slice(0, 5);
    const totalAmount = submissions.reduce((sum, sub) => sum + (sub.amount || 0), 0);

    const getMonthlyGroups = () => {
        const groups = {};
        submissions.forEach(sub => {
            // Priority: timestamp (actual submission) then dateOfWork (manual entry)
            const date = sub.dateOfWork ? new Date(sub.dateOfWork) : (sub.timestamp ? new Date(sub.timestamp) : new Date());
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleString('default', { month: 'long', year: 'numeric' });

            if (!groups[monthKey]) {
                groups[monthKey] = {
                    label: monthLabel,
                    total: 0,
                    cash: 0,
                    bank: 0,
                    count: 0
                };
            }
            groups[monthKey].total += (sub.amount || 0);
            groups[monthKey].cash += (sub.cashAmount || 0);
            groups[monthKey].bank += (sub.bankAmount || 0);
            groups[monthKey].count += 1;
        });
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    };

    const monthlyData = getMonthlyGroups();

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (pwdData.newPassword !== pwdData.confirmPassword) {
            setError("New passwords do not match!");
            return;
        }

        if (pwdData.newPassword.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        setPwdLoading(true);
        try {
            // Verify current password (simplified)
            const distRef = ref(db, `districts/${user.districtId}`);
            const snapshot = await get(distRef);

            if (snapshot.exists() && snapshot.val().password === pwdData.currentPassword) {
                await update(distRef, { password: pwdData.newPassword });
                setSuccess("Password updated successfully!");
                setPwdData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                setError("Current password is incorrect.");
            }
        } catch (err) {
            setError("Failed to update password: " + err.message);
        } finally {
            setPwdLoading(false);
        }
    };

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                        <MapPin className="text-navy w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm leading-tight">Xogta Qorshaynta</h2>
                        <span className="text-[10px] text-slate-400">Somali Region, Ethiopia</span>
                    </div>
                </div>

                <nav className="nav-links">
                    <button
                        className={`nav-item w-full ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </button>
                    <button
                        className={`nav-item w-full ${activeTab === 'new' ? 'active' : ''}`}
                        onClick={() => setActiveTab('new')}
                    >
                        <Plus size={20} />
                        <span>New Submission</span>
                    </button>
                    <button
                        className={`nav-item w-full ${activeTab === 'monthly' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('monthly');
                            setError('');
                            setSuccess('');
                            startNewReport();
                        }}
                    >
                        <FileText size={20} />
                        <span>Monthly Report</span>
                    </button>
                    <button
                        className={`nav-item w-full ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <History size={20} />
                        <span>History</span>
                    </button>
                    <button
                        className={`nav-item w-full ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        <Lock size={20} />
                        <span>Security</span>
                    </button>
                </nav>

                <div className="sidebar-footer p-6 border-t border-white/10">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">{user?.districtId === 'somaliregional' ? 'Office' : 'District'}</div>
                    <div className="font-semibold text-accent mb-6 truncate">{user?.name}</div>
                    <button
                        onClick={logout}
                        className="btn w-full justify-center bg-white/10 hover:bg-white/20 text-white text-sm"
                    >
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="header">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">
                            <MapPin className="text-accent w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-text-main">Xogta Qorshaynta</div>
                            <div className="text-[10px] text-muted uppercase tracking-wider">{user?.districtId === 'somaliregional' ? `Somali Region / ${user?.name}` : `${user?.zoneId} / ${user?.name}`}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            className="btn btn-primary"
                            onClick={() => setActiveTab('new')}
                        >
                            <Plus size={18} />
                            New Entry
                        </button>
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border border-border">
                            <User size={20} className="text-gray-500" />
                        </div>
                    </div>
                </header>

                <div className="content-body animate-fade-in">
                    {activeTab === 'dashboard' && (
                        <div>
                            <h1 className="text-2xl font-extrabold text-navy mb-8">{user?.districtId === 'somaliregional' ? 'Regional Revenue Overview' : 'District Overview'}</h1>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="card flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted font-medium mb-1">Total Submissions</div>
                                        <div className="text-3xl font-bold">{submissions.length}</div>
                                    </div>
                                    <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                                        <FileText size={24} />
                                    </div>
                                </div>

                                <div className="card flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted font-medium mb-1">Total Budget Recorded</div>
                                        <div className="text-3xl font-bold">{totalAmount.toLocaleString()}</div>
                                    </div>
                                    <div className="p-3 bg-accent/10 text-accent rounded-2xl">
                                        <DollarSign size={24} />
                                    </div>
                                </div>

                                <div className="card flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted font-medium mb-1">Last Update</div>
                                        <div className="text-xl font-bold">
                                            {submissions[0] ? new Date(submissions[0].timestamp).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                                        <History size={24} />
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
                                <div className="space-y-4">
                                    {recentSubmissions.map(sub => (
                                        <div key={sub.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2 h-2 rounded-full ${sub.paymentType === 'CASH' ? 'bg-green-500' : 'bg-accent'}`}></div>
                                                <div>
                                                    <div className="font-bold text-sm text-text-main">{sub.resource}</div>
                                                    <div className="text-[10px] text-muted">{sub.bookSerial} • {sub.dateOfWork}</div>
                                                </div>
                                            </div>
                                            <div className="text-sm font-bold text-text-main">
                                                {sub.amount.toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                    {recentSubmissions.length === 0 && <p className="text-muted text-center py-4">No activity yet.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'new' && (
                        <div className="max-w-4xl mx-auto">
                            <div className="flex items-center justify-between mb-8">
                                <h1 className="text-2xl font-extrabold text-navy">Create Work Record</h1>
                                <button onClick={() => setActiveTab('dashboard')} className="text-sm text-accent hover:underline">Cancel</button>
                            </div>

                            {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium text-sm">{error}</div>}
                            {success && <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-xl border border-green-100 font-medium text-sm">{success}</div>}

                            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="card space-y-4">
                                        <h3 className="text-sm font-bold uppercase text-muted tracking-widest mb-2">Record Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[11px] font-bold text-muted uppercase ml-1">Serial Number</label>
                                                <input type="text" name="bookSerial" required className="input-field" placeholder="BK-12345" value={formData.bookSerial} onChange={handleChange} />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-muted uppercase ml-1">Resource Name</label>
                                                <input type="text" name="resource" required className="input-field" placeholder="Enter resource name" value={formData.resource} onChange={handleChange} />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-muted uppercase ml-1">Date of Work</label>
                                                <input type="date" name="dateOfWork" required className="input-field" value={formData.dateOfWork} onChange={handleChange} />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-muted uppercase ml-1">Total Amount (ETB)</label>
                                                <input
                                                    type="number"
                                                    name="amount"
                                                    required
                                                    className="input-field font-bold text-text-main"
                                                    placeholder="0.00"
                                                    value={formData.amount}
                                                    onChange={handleAmountChange}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-muted uppercase ml-1">Model / 64 No.</label>
                                                <input type="text" name="model64Number" required className="input-field" value={formData.model64Number} onChange={handleChange} />
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-muted uppercase ml-1">64 Amount</label>
                                                <input type="number" name="amount64" required className="input-field" value={formData.amount64} onChange={handleChange} />

                                                {formData.amount && formData.amount64 && parseFloat(formData.amount) !== parseFloat(formData.amount64) && (
                                                    <div className="mt-3 p-3 bg-orange-50 border border-orange-100 rounded-xl animate-fade-in shadow-sm">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Unallocated Balance</span>
                                                            <span className="text-text-main font-black text-sm">{(parseFloat(formData.amount) - parseFloat(formData.amount64)).toLocaleString()} ETB</span>
                                                        </div>
                                                        <p className="text-[9px] text-orange-500 font-medium mb-3 opacity-80">
                                                            The difference between Total and Model 64 will be handled as:
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const total = parseFloat(formData.amount);
                                                                    const m64 = parseFloat(formData.amount64);
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        cashAmount: (total - m64),
                                                                        bankAmount: m64
                                                                    }));
                                                                }}
                                                                className="text-[10px] bg-white border border-orange-200 text-orange-700 py-2 rounded-lg font-bold hover:bg-orange-100 transition-colors"
                                                            >
                                                                Set as Cash
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const total = parseFloat(formData.amount);
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        cashAmount: 0,
                                                                        bankAmount: total
                                                                    }));
                                                                }}
                                                                className="text-[10px] bg-orange-600 text-white py-2 rounded-lg font-bold hover:bg-orange-700 transition-colors"
                                                            >
                                                                Set as Bank
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="card space-y-6">
                                        <h3 className="text-sm font-bold uppercase text-muted tracking-widest mb-6">Payment Distribution</h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Cash Portion</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="input-field"
                                                    value={formData.cashAmount}
                                                    onChange={(e) => handlePaymentChange('cashAmount', e.target.value)}
                                                />
                                            </div>

                                            <div className="pt-2 border-t border-white/5 relative">
                                                {!formData.model64Number && (
                                                    <div className="absolute inset-x-0 -top-1 px-2 pointer-events-none">
                                                        <span className="bg-orange-500/20 text-orange-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
                                                            Enter Model 64 to use Bank
                                                        </span>
                                                    </div>
                                                )}
                                                <label className={`text-[11px] font-bold uppercase tracking-widest block mb-2 ${!formData.model64Number ? 'text-gray-600' : 'text-gray-400'}`}>
                                                    Select Bank
                                                </label>
                                                <select
                                                    name="bankName"
                                                    disabled={!formData.model64Number}
                                                    className={`input-field ${!formData.model64Number ? 'opacity-30 cursor-not-allowed' : ''}`}
                                                    value={formData.bankName}
                                                    onChange={handleChange}
                                                >
                                                    <option value="">-- Choose Bank --</option>
                                                    <option value="CBE">CBE</option>
                                                    <option value="E-BIRR">E-BIRR</option>
                                                    <option value="KAAFI">KAAFI</option>
                                                    <option value="ABYSINIA">ABYSINIA</option>
                                                    <option value="DASHEN">DASHEN</option>
                                                </select>
                                            </div>

                                            <div className={(formData.bankName && formData.model64Number) ? 'opacity-100' : 'opacity-30 pointer-events-none'}>
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Bank Amount</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    disabled={!formData.model64Number || !formData.bankName}
                                                    className="input-field"
                                                    value={formData.bankAmount}
                                                    onChange={(e) => handlePaymentChange('bankAmount', e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
                                            <div className="text-xs text-gray-400">Total Valid</div>
                                            <div className={`text-lg font-bold ${Math.abs((parseFloat(formData.amount) || 0) - (parseFloat(formData.cashAmount) || 0) - (parseFloat(formData.bankAmount) || 0)) < 0.01 ? 'text-green-400' : 'text-red-400'}`}>
                                                {((parseFloat(formData.cashAmount) || 0) + (parseFloat(formData.bankAmount) || 0)).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary w-full py-4 text-lg justify-center shadow-xl shadow-accent/20">
                                        Submit to Database
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'monthly' && (
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h1 className="text-2xl font-extrabold text-navy">Monthly Revenue Performance</h1>
                                    <p className="text-muted text-sm italic">Plan vs Actual Detailed Monitoring</p>
                                </div>
                            </div>

                            {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium text-sm animate-bounce">{error}</div>}
                            {success && <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-xl border border-green-100 font-medium text-sm animate-pulse">{success}</div>}

                            <div className="animate-fade-in space-y-8">
                                <div className="card max-w-5xl mx-auto">
                                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                                        <div>
                                            <label className="text-[10px] font-black text-muted uppercase tracking-tighter block mb-2">Select Reporting Month</label>
                                            <input
                                                type="month"
                                                className="p-3 border-2 border-accent/10 rounded-2xl outline-none focus:border-accent font-black text-text-main"
                                                value={reportMonth}
                                                onChange={(e) => startNewReport(e.target.value)}
                                            />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-text-main mb-1">{user.name}</div>
                                            <div className="text-[10px] text-muted uppercase tracking-widest font-bold">Revenue Performance Form</div>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-slate-50 border-y border-slate-100">
                                                    <th className="p-4 text-left text-[10px] font-black text-muted uppercase">KODHKA</th>
                                                    <th className="p-4 text-left text-[10px] font-black text-muted uppercase">Ilaha Dakhliga</th>
                                                    <th className="p-4 text-left text-[10px] font-black text-muted uppercase">PLAN (ETB)</th>
                                                    <th className="p-4 text-left text-[10px] font-black text-muted uppercase">ACTUAL (ETB)</th>
                                                    <th className="p-4 text-right text-[10px] font-black text-muted uppercase">Deficit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {REVENUE_CATEGORIES.map((cat, idx) => {
                                                    if (cat.isHeader) {
                                                        return (
                                                            <tr key={idx} className="bg-green-50/50">
                                                                <td colSpan="5" className="p-4 text-center font-black text-green-700 text-xs tracking-widest uppercase">
                                                                    {cat.name}
                                                                </td>
                                                            </tr>
                                                        );
                                                    }
                                                    const id = cat.code || cat.name;
                                                    const plan = monthlyReportData[id]?.plan || 0;
                                                    const actual = monthlyReportData[id]?.actual || 0;
                                                    const deficit = plan - actual;

                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="p-3 font-mono text-[11px] text-muted">{cat.code}</td>
                                                            <td className="p-3 font-bold text-text-main text-xs">{cat.name}</td>
                                                            <td className="p-3">
                                                                <input
                                                                    type="number"
                                                                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-accent outline-none"
                                                                    placeholder="0.00"
                                                                    value={monthlyReportData[id]?.plan || ""}
                                                                    onChange={(e) => handleMonthlyReportChange(id, 'plan', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className="p-3">
                                                                <input
                                                                    type="number"
                                                                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-green-500 outline-none"
                                                                    placeholder="0.00"
                                                                    value={monthlyReportData[id]?.actual || ""}
                                                                    onChange={(e) => handleMonthlyReportChange(id, 'actual', e.target.value)}
                                                                />
                                                            </td>
                                                            <td className={`p-3 text-right text-xs font-black ${deficit > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                                {deficit.toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {/* TOTAL ROW */}
                                                <tr className="bg-navy text-white font-black">
                                                    <td className="p-4" colSpan="2">TOTAL REVENUE</td>
                                                    <td className="p-4">
                                                        {REVENUE_CATEGORIES.filter(c => !c.isHeader).reduce((sum, c) => sum + (monthlyReportData[c.code || c.name]?.plan || 0), 0).toLocaleString()}
                                                    </td>
                                                    <td className="p-4">
                                                        {REVENUE_CATEGORIES.filter(c => !c.isHeader).reduce((sum, c) => sum + (monthlyReportData[c.code || c.name]?.actual || 0), 0).toLocaleString()}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        {REVENUE_CATEGORIES.filter(c => !c.isHeader).reduce((sum, c) => sum + ((monthlyReportData[c.code || c.name]?.plan || 0) - (monthlyReportData[c.code || c.name]?.actual || 0)), 0).toLocaleString()}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mt-10 flex justify-end gap-4 pb-6">
                                        <button
                                            onClick={handleSaveMonthlyReport}
                                            disabled={reportLoading}
                                            className="btn btn-primary px-12 py-3 rounded-2xl flex items-center gap-2 shadow-xl shadow-accent/20"
                                        >
                                            {reportLoading ? 'Saving...' : 'Save Performance Report'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div>
                            <h1 className="text-2xl font-extrabold text-text-main mb-8">Submission Records</h1>
                            <div className="card overflow-hidden p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 border-b border-border">
                                            <tr>
                                                <th className="p-4 text-[10px] font-bold uppercase text-muted">Date</th>
                                                <th className="p-4 text-[10px] font-bold uppercase text-muted">Resource</th>
                                                <th className="p-4 text-[10px] font-bold uppercase text-muted">Payment</th>
                                                <th className="p-4 text-[10px] font-bold uppercase text-muted text-right">Total Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 text-sm">
                                            {submissions.map(sub => (
                                                <tr key={sub.id} className="hover:bg-gray-50">
                                                    <td className="p-4 font-mono text-xs text-muted">{sub.dateOfWork}</td>
                                                    <td className="p-4">
                                                        <div className="font-bold text-text-main">{sub.resource}</div>
                                                        <div className="text-[10px] text-muted flex gap-2">
                                                            <span>SN: {sub.bookSerial}</span>
                                                            <span className="text-accent font-bold">M64: {sub.model64Number}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${sub.paymentType === 'CASH' ? 'bg-green-100 text-green-700' :
                                                            sub.paymentType === 'BANK' ? 'bg-accent/10 text-accent' : 'bg-purple-100 text-purple-700'
                                                            }`}>
                                                            {sub.paymentType === 'BANK' ? (sub.bankName || 'BANK') : sub.paymentType}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-xl font-bold text-text-main">
                                                        {sub.amount.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {submissions.length === 0 && (
                                                <tr><td colSpan="4" className="p-10 text-center text-muted italic">No records found.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="max-w-md mx-auto">
                            <h1 className="text-2xl font-extrabold text-text-main mb-2">Account Security</h1>
                            <p className="text-muted mb-8 italic">Manage your district access credentials</p>

                            {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium text-sm">{error}</div>}
                            {success && <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-xl border border-green-100 font-medium text-sm">{success}</div>}

                            <div className="card">
                                <h3 className="text-lg font-bold mb-6">Change Password</h3>
                                <form onSubmit={handlePasswordChange} className="space-y-4">
                                    <div>
                                        <label className="text-[11px] font-bold text-muted uppercase ml-1">Current Password</label>
                                        <input
                                            type="password"
                                            required
                                            className="input-field"
                                            value={pwdData.currentPassword}
                                            onChange={(e) => setPwdData({ ...pwdData, currentPassword: e.target.value })}
                                        />
                                    </div>
                                    <div className="pt-4 border-t border-gray-50">
                                        <label className="text-[11px] font-bold text-muted uppercase ml-1">New Password</label>
                                        <input
                                            type="password"
                                            required
                                            className="input-field"
                                            value={pwdData.newPassword}
                                            onChange={(e) => setPwdData({ ...pwdData, newPassword: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-muted uppercase ml-1">Confirm New Password</label>
                                        <input
                                            type="password"
                                            required
                                            className="input-field"
                                            value={pwdData.confirmPassword}
                                            onChange={(e) => setPwdData({ ...pwdData, confirmPassword: e.target.value })}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={pwdLoading}
                                        className="btn btn-primary w-full justify-center py-3 mt-4"
                                    >
                                        {pwdLoading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
