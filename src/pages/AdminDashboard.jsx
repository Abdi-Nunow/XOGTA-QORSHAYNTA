import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/firebase";
import { ref, get, onValue, remove } from "firebase/database";
import {
    LayoutDashboard,
    BarChart3,
    Users,
    LogOut,
    Search,
    User,
    ShieldCheck,
    TrendingUp,
    Map,
    Filter,
    X,
    FileText,
    Download,
    FileSpreadsheet,
    FileWarning,
    FileDown,
    MoreVertical,
    Settings,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { REVENUE_CATEGORIES } from '../lib/constants';

export default function AdminDashboard() {
    const { logout, user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    // Data State
    const [data, setData] = useState([]);
    const [monthlyData, setMonthlyData] = useState({});
    const [zones, setZones] = useState({});
    const [districts, setDistricts] = useState({});

    // Filter State
    const [filterZone, setFilterZone] = useState('');
    const [filterDistrict, setFilterDistrict] = useState('');
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

    useEffect(() => {
        const zonesRef = ref(db, 'zones');
        const unsubZones = onValue(zonesRef, (snapshot) => {
            if (snapshot.exists()) setZones(snapshot.val());
        });

        const districtsRef = ref(db, 'districts');
        const unsubDistricts = onValue(districtsRef, (snapshot) => {
            if (snapshot.exists()) setDistricts(snapshot.val());
        });

        const subsRef = ref(db, 'submissions');
        const unsubSubs = onValue(subsRef, (snapshot) => {
            if (snapshot.exists()) setData(snapshot.val());
            else setData([]);
        });

        const monthlyRef = ref(db, 'monthly_reports');
        const unsubMonthly = onValue(monthlyRef, (snapshot) => {
            if (snapshot.exists()) setMonthlyData(snapshot.val());
            else setMonthlyData({});
        });

        return () => {
            unsubZones();
            unsubDistricts();
            unsubSubs();
            unsubMonthly();
        };
    }, []);

    const { filteredData, totals } = useMemo(() => {
        // Flatten data
        const flat = [];
        Object.entries(data || {}).forEach(([distId, subMap]) => {
            const dInfo = districts[distId] || {};
            Object.entries(subMap).forEach(([subId, val]) => {
                flat.push({
                    id: subId,
                    districtId: distId,
                    zoneId: val.zoneId || val.regionId || dInfo.zoneId,
                    districtName: val.districtName || dInfo.name || distId,
                    ...val
                });
            });
        });

        let res = flat;
        if (filterZone) res = res.filter(item => item.zoneId === filterZone);
        if (filterDistrict) res = res.filter(item => item.districtId === filterDistrict);
        if (filterDateStart) res = res.filter(item => item.dateOfWork >= filterDateStart);
        if (filterDateEnd) res = res.filter(item => item.dateOfWork <= filterDateEnd);

        res.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        const t = res.reduce((acc, curr) => ({
            amount: acc.amount + (parseFloat(curr.amount) || 0),
            cash: acc.cash + (parseFloat(curr.cashAmount) || 0),
            bank: acc.bank + (parseFloat(curr.bankAmount) || 0),
            amount64: acc.amount64 + (parseFloat(curr.amount64) || 0),
            count: acc.count + 1
        }), { amount: 0, cash: 0, bank: 0, amount64: 0, count: 0 });

        return { filteredData: res, totals: t };
    }, [data, districts, filterZone, filterDistrict, filterDateStart, filterDateEnd]);

    const aggregatedMonthly = useMemo(() => {
        const result = {};
        Object.entries(monthlyData).forEach(([distId, yearMonthMap]) => {
            const dInfo = districts[distId] || {};
            const zoneId = dInfo.zoneId;

            // Apply Filters
            if (filterZone && zoneId !== filterZone) return;
            if (filterDistrict && distId !== filterDistrict) return;

            const monthReport = yearMonthMap[filterMonth];
            if (!monthReport || !monthReport.data) return;

            if (Array.isArray(monthReport.data)) {
                monthReport.data.forEach(item => {
                    const catId = item.code;
                    if (!catId) return;
                    if (!result[catId]) result[catId] = { plan: 0, actual: 0 };
                    result[catId].plan += (parseFloat(item.plan) || 0);
                    result[catId].actual += (parseFloat(item.actual) || 0);
                });
            } else {
                // Fallback for objects
                Object.entries(monthReport.data).forEach(([catId, vals]) => {
                    if (!result[catId]) result[catId] = { plan: 0, actual: 0 };
                    result[catId].plan += (parseFloat(vals.plan) || 0);
                    result[catId].actual += (parseFloat(vals.actual) || 0);
                });
            }
        });
        return result;
    }, [monthlyData, districts, filterZone, filterDistrict, filterMonth]);

    const availableDistricts = useMemo(() => {
        if (!filterZone) return Object.entries(districts);
        return Object.entries(districts).filter(([_, d]) => d.zoneId === filterZone);
    }, [districts, filterZone]);

    // Danger Zone Logic
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const handleFactoryReset = async () => {
        setIsResetting(true);
        try {
            // Remove all data from the root
            const rootRef = ref(db);
            await remove(rootRef);

            // Force reload to trigger auto-seeding on next login
            window.location.reload();
        } catch (error) {
            console.error("Reset failed:", error);
            alert("Failed to reset database. Check console for details.");
            setIsResetting(false);
        }
    };

    // Export Functions
    const exportToExcel = (row) => {
        const data = [{
            "Date of Work": row.dateOfWork,
            "Zone": zones[row.zoneId]?.name,
            "District": row.districtName,
            "Resource": row.resource,
            "Serial Number": row.bookSerial,
            "Model 64 Number": row.model64Number,
            "Total Amount": row.amount,
            "Cash Amount": row.cashAmount,
            "Bank Amount": row.bankAmount,
            "Bank Name": row.bankName || 'N/A'
        }];
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Submission");
        XLSX.writeFile(wb, `Form_${row.districtName}_${row.dateOfWork}.xlsx`);
    };

    const exportToPDF = (row) => {
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.setTextColor(26, 35, 126); // Navy color
        doc.text("Xafiiska dakhliga DDS - Xogta Qorshaynta", 20, 25);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Official Submission Record", 20, 32);
        doc.line(20, 35, 190, 35);

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Submission ID: ${row.id}`, 20, 45);
        doc.text(`Zone: ${zones[row.zoneId]?.name || 'N/A'}`, 20, 55);
        doc.text(`District: ${row.districtName}`, 20, 65);
        doc.text(`Date of Work: ${row.dateOfWork}`, 20, 75);

        doc.setFillColor(245, 247, 250);
        doc.rect(20, 85, 170, 40, 'F');
        doc.setFontSize(14);
        doc.text("Record Details", 25, 95);
        doc.setFontSize(11);
        doc.text(`Resource Name: ${row.resource}`, 25, 105);
        doc.text(`Serial Number: ${row.bookSerial}`, 25, 115);
        doc.text(`Model 64 No: ${row.model64Number}`, 120, 115);

        doc.line(20, 135, 190, 135);
        doc.setFontSize(14);
        doc.text("Financial Breakdown", 20, 145);

        doc.setFontSize(11);
        doc.text("Total Amount:", 20, 155);
        doc.setFontSize(12);
        doc.text(`${row.amount.toLocaleString()} ETB`, 60, 155);

        doc.setFontSize(11);
        doc.text("Cash Portion:", 20, 165);
        doc.text(`${row.cashAmount?.toLocaleString()} ETB`, 60, 165);

        doc.text("Bank Portion:", 20, 175);
        doc.text(`${row.bankAmount?.toLocaleString()} ETB`, 60, 175);
        if (row.bankName) {
            doc.setFontSize(9);
            doc.text(`Bank Account: ${row.bankName}`, 60, 180);
        }

        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Verified at: ${new Date(row.timestamp).toLocaleString()}`, 20, 280);

        doc.save(`Record_${row.districtName}_${row.dateOfWork}.pdf`);
    };

    const exportToWord = (row) => {
        const html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                    .header { color: #1a237e; border-bottom: 2px solid #eee; margin-bottom: 20px; }
                    .field { margin-bottom: 10px; }
                    .label { font-weight: bold; color: #666; width: 150px; display: inline-block; }
                    .section { background: #f5f7fa; padding: 15px; margin: 20px 0; border-radius: 5px; }
                    .total { font-size: 1.2em; font-weight: bold; border-top: 1px solid #ddd; padding-top: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Xafiiska dakhliga DDS - Xogta Qorshaynta</h1>
                    <p>Official Submission Record</p>
                </div>
                
                <div class="field"><span class="label">Zone:</span> ${zones[row.zoneId]?.name || 'N/A'}</div>
                <div class="field"><span class="label">District:</span> ${row.districtName}</div>
                <div class="field"><span class="label">Date of Work:</span> ${row.dateOfWork}</div>
                
                <div class="section">
                    <h3>Record Details</h3>
                    <div class="field"><span class="label">Resource Name:</span> ${row.resource}</div>
                    <div class="field"><span class="label">Serial Number:</span> ${row.bookSerial}</div>
                    <div class="field"><span class="label">Model 64 Number:</span> ${row.model64Number}</div>
                </div>
                
                <h3>Financial Breakdown</h3>
                <div class="total"><span class="label">Total Amount:</span> ${row.amount.toLocaleString()} ETB</div>
                <div class="field"><span class="label">Cash Portion:</span> ${row.cashAmount?.toLocaleString()} ETB</div>
                <div class="field"><span class="label">Bank Portion:</span> ${row.bankAmount?.toLocaleString()} ETB</div>
                ${row.bankName ? `<div class="field"><span class="label">Bank Name:</span> ${row.bankName}</div>` : ''}
                
                <p style="margin-top: 50px; color: #999; font-size: 0.8em;">Verified at: ${new Date(row.timestamp).toLocaleString()}</p>
            </body>
            </html>
        `;
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Record_${row.districtName}_${row.dateOfWork}.doc`;
        link.click();
    };

    const [openMenu, setOpenMenu] = useState(null);

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                        <ShieldCheck className="text-navy w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm leading-tight">Xafiiska dakhliga DDS</h2>
                        <h2 className="font-bold text-sm leading-tight">Xogta Qorshaynta</h2>
                    </div>
                </div>

                <nav className="nav-links">
                    <button
                        className={`nav-item w-full ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </button>
                    <button
                        className={`nav-item w-full ${activeTab === 'reports' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reports')}
                    >
                        <BarChart3 size={20} />
                        <span>Financial Reports</span>
                    </button>
                    <button
                        className={`nav-item w-full ${activeTab === 'monthly' ? 'active' : ''}`}
                        onClick={() => setActiveTab('monthly')}
                    >
                        <FileText size={20} />
                        <span>Monthly Performance</span>
                    </button>
                    <button
                        className={`nav-item w-full ${activeTab === 'districts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('districts')}
                    >
                        <Map size={20} />
                        <span>Zones & Districts</span>
                    </button>
                    <button
                        className={`nav-item w-full ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        <Settings size={20} />
                        <span>Settings</span>
                    </button>
                </nav>

                <div className="sidebar-footer p-6 border-t border-white/10">
                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Authenticated as</div>
                    <div className="font-semibold text-accent mb-6 truncate">Super Administrator</div>
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
                            <ShieldCheck className="text-accent w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-text-main">Xafiiska dakhliga DDS</div>
                            <div className="font-bold text-text-main">Xogta Qorshaynta</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative hidden md:block">
                            <Search className="absolute left-3 top-2.5 text-muted w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search records..."
                                className="bg-gray-100 border-none rounded-full py-2 pl-10 pr-4 text-sm w-64 outline-none focus:ring-2 focus:ring-accent/20"
                            />
                        </div>
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border border-border">
                            <User size={20} className="text-gray-500" />
                        </div>
                    </div>
                </header>

                <div className="content-body animate-fade-in">
                    {activeTab === 'overview' && (
                        <div>
                            <h1 className="text-2xl font-extrabold text-text-main mb-8">System Overview</h1>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                <div className="card">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="text-sm font-bold text-muted uppercase tracking-wider">Submissions</div>
                                        <div className="bg-accent/10 p-2 rounded-lg text-accent"><TrendingUp size={20} /></div>
                                    </div>
                                    <div className="text-3xl font-black text-text-main">{totals.count}</div>
                                    <div className="text-[11px] text-green-500 font-bold mt-1">Real-time sync active</div>
                                </div>

                                <div className="card">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="text-sm font-bold text-muted uppercase tracking-wider">Total Volume</div>
                                        <div className="bg-green-50 p-2 rounded-lg text-green-600"><TrendingUp size={20} /></div>
                                    </div>
                                    <div className="text-3xl font-black text-text-main">{totals.amount.toLocaleString()}</div>
                                    <div className="text-[11px] text-muted font-bold mt-1">ETB Currency</div>
                                </div>

                                <div className="card">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="text-sm font-bold text-muted uppercase tracking-wider">Cash Intake</div>
                                        <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><BarChart3 size={20} /></div>
                                    </div>
                                    <div className="text-3xl font-black text-text-main">{totals.cash.toLocaleString()}</div>
                                    <div className="text-[11px] text-muted font-bold mt-1">Managed Assets</div>
                                </div>

                                <div className="card">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="text-sm font-bold text-muted uppercase tracking-wider">Bank Transfer</div>
                                        <div className="bg-orange-50 p-2 rounded-lg text-orange-600"><TrendingUp size={20} /></div>
                                    </div>
                                    <div className="text-3xl font-black text-text-main">{totals.bank.toLocaleString()}</div>
                                    <div className="text-[11px] text-muted font-bold mt-1">Digital Processing</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2">
                                    <div className="card">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-bold text-text-main">Recent Submissions</h3>
                                            <button onClick={() => setActiveTab('reports')} className="text-xs text-accent font-bold hover:underline">View All</button>
                                        </div>
                                        <div className="space-y-4">
                                            {filteredData.slice(0, 10).map(row => (
                                                <div key={row.id} className="flex items-center justify-between p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-xl transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-2 rounded-lg ${row.paymentType === 'CASH' ? 'bg-green-100 text-green-600' : 'bg-accent/10 text-accent'}`}>
                                                            <FileText size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-sm text-text-main">{row.districtName}</div>
                                                            <div className="text-[10px] text-muted">{zones[row.zoneId]?.name} • {row.dateOfWork}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-black text-text-main">{row.amount.toLocaleString()}</div>
                                                        <div className="text-[10px] text-muted">{row.resource}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="card mb-8">
                                        <h3 className="text-lg font-bold text-text-main mb-4">Zones Active</h3>
                                        <div className="space-y-3">
                                            {Object.entries(zones).map(([id, z]) => (
                                                <div key={id} className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-muted font-bold text-xs">{id.slice(-2)}</div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-semibold">{z.name}</div>
                                                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1">
                                                            <div className="bg-accent h-full rounded-full" style={{ width: '40%' }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <h1 className="text-2xl font-extrabold text-text-main">Financial Reports</h1>
                                <div className="flex gap-2">
                                    <button className="btn bg-white border border-border text-sm" onClick={() => window.print()}>Export PDF</button>
                                </div>
                            </div>

                            {/* Filters Header */}
                            <div className="card mb-8 border-l-4 border-accent">
                                <div className="flex flex-wrap gap-6 items-end">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-[11px] font-bold text-muted uppercase ml-1">Zone</label>
                                        <select
                                            className="input-field mt-1"
                                            value={filterZone}
                                            onChange={e => { setFilterZone(e.target.value); setFilterDistrict(''); }}
                                        >
                                            <option value="">All Zones</option>
                                            {Object.entries(zones).map(([id, z]) => (
                                                <option key={id} value={id}>{z.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-[11px] font-bold text-muted uppercase ml-1">District</label>
                                        <select
                                            className="input-field mt-1"
                                            value={filterDistrict}
                                            onChange={e => setFilterDistrict(e.target.value)}
                                            disabled={!filterZone}
                                        >
                                            <option value="">All Districts</option>
                                            {availableDistricts.map(([id, d]) => (
                                                <option key={id} value={id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="text-[11px] font-bold text-muted uppercase ml-1">From</label>
                                        <input type="date" className="input-field mt-1" value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} />
                                    </div>
                                    <div className="flex-1 min-w-[150px]">
                                        <label className="text-[11px] font-bold text-muted uppercase ml-1">To</label>
                                        <input type="date" className="input-field mt-1" value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} />
                                    </div>
                                    <button
                                        className="p-3 text-muted hover:text-red-500 transition-colors"
                                        onClick={() => { setFilterZone(''); setFilterDistrict(''); setFilterDateStart(''); setFilterDateEnd(''); }}
                                        title="Clear Filters"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Data Table */}
                            <div className="card p-0 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 border-b border-border">
                                            <tr>
                                                <th className="p-4 text-[10px] font-bold uppercase text-muted">Date</th>
                                                <th className="p-4 text-[10px] font-bold uppercase text-muted">Origin</th>
                                                <th className="p-4 text-[10px] font-bold uppercase text-muted">Details</th>
                                                <th className="p-4 text-[10px] font-bold uppercase text-muted text-right">Total Amount</th>
                                                <th className="p-4 text-[10px] font-bold uppercase text-muted text-right">Cash</th>
                                                <th className="p-4 text-[10px] font-bold uppercase text-muted text-right">Bank</th>
                                                <th className="p-4 text-[10px] font-bold uppercase text-muted text-center italic">Download Form</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 text-sm">
                                            {filteredData.map(row => (
                                                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4 text-xs font-mono text-muted">{row.dateOfWork}</td>
                                                    <td className="p-4">
                                                        <div className="font-bold text-text-main">{row.districtName}</div>
                                                        <div className="text-[10px] text-muted">{zones[row.zoneId]?.name}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-medium text-text-main">{row.resource}</div>
                                                        <div className="text-[10px] text-muted flex flex-wrap gap-x-3">
                                                            <span>Serial: {row.bookSerial}</span>
                                                            <span className="text-accent font-bold">{row.model64Number}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right font-black text-text-main">{row.amount.toLocaleString()}</td>
                                                    <td className="p-4 text-right text-gray-600">{row.cashAmount?.toLocaleString()}</td>
                                                    <td className="p-4 text-right text-gray-600">
                                                        <div className="font-bold">{row.bankAmount?.toLocaleString()}</div>
                                                        {row.bankName && <div className="text-[9px] uppercase font-black text-accent">{row.bankName}</div>}
                                                    </td>
                                                    <td className="p-4 text-center relative">
                                                        <button
                                                            className="p-2 hover:bg-gray-100 rounded-lg text-muted transition-colors inline-flex items-center gap-1"
                                                            onClick={() => setOpenMenu(openMenu === row.id ? null : row.id)}
                                                        >
                                                            <Download size={16} />
                                                            <span className="text-[10px] font-bold uppercase">Export</span>
                                                        </button>

                                                        {openMenu === row.id && (
                                                            <div className="absolute right-0 top-12 bg-white shadow-2xl rounded-xl border border-gray-100 p-2 z-50 w-32 animate-fade-in origin-top-right">
                                                                <button onClick={() => { exportToPDF(row); setOpenMenu(null); }} className="w-full text-left p-2 hover:bg-red-50 text-red-600 text-[11px] font-bold rounded-lg flex items-center gap-2">
                                                                    <FileText size={14} /> PDF
                                                                </button>
                                                                <button onClick={() => { exportToExcel(row); setOpenMenu(null); }} className="w-full text-left p-2 hover:bg-green-50 text-green-600 text-[11px] font-bold rounded-lg flex items-center gap-2">
                                                                    <FileSpreadsheet size={14} /> Excel
                                                                </button>
                                                                <button onClick={() => { exportToWord(row); setOpenMenu(null); }} className="w-full text-left p-2 hover:bg-accent/10 text-accent text-[11px] font-bold rounded-lg flex items-center gap-2">
                                                                    <FileDown size={14} /> Word
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 border-t-2 border-border font-black text-text-main">
                                            <tr>
                                                <td colSpan="3" className="p-4 text-right text-[10px] uppercase font-bold text-muted">Total Aggregation</td>
                                                <td className="p-4 text-right">{totals.amount.toLocaleString()}</td>
                                                <td className="p-4 text-right">{totals.cash.toLocaleString()}</td>
                                                <td className="p-4 text-right">{totals.bank.toLocaleString()}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'districts' && (
                        <div>
                            <h1 className="text-2xl font-extrabold text-text-main mb-8">Woreda Matrix</h1>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {Object.entries(districts).map(([id, d]) => (
                                    <div key={id} className="card hover:shadow-lg transition-shadow border-t-4 border-accent">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-black text-text-main text-lg">{d.name}</h4>
                                                <p className="text-xs text-muted">Zone ID: {d.zoneId}</p>
                                            </div>
                                            <Users className="text-gray-300" size={24} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                                            <div>
                                                <div className="text-[10px] font-bold text-muted uppercase">Username</div>
                                                <div className="text-xs font-mono bg-gray-50 p-1 rounded mt-1">{d.username}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-muted uppercase">Password</div>
                                                <div className="text-xs font-mono bg-gray-50 p-1 rounded mt-1">********</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'monthly' && (
                        <div>
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h1 className="text-2xl font-extrabold text-text-main">District Monthly Performance</h1>
                                    <div className="flex items-center gap-2 text-green-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                                        <span>Live Regional Aggregation</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="bg-white p-2 rounded-xl border border-border shadow-sm flex items-center gap-2">
                                        <label className="text-[10px] font-black text-muted uppercase">Month:</label>
                                        <input
                                            type="month"
                                            className="outline-none font-bold text-text-main text-sm"
                                            value={filterMonth}
                                            onChange={(e) => setFilterMonth(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Monthly Filters */}
                            <div className="card mb-8">
                                <div className="flex flex-wrap gap-6 items-end">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-[11px] font-bold text-muted uppercase ml-1">Zone</label>
                                        <select
                                            className="input-field mt-1"
                                            value={filterZone}
                                            onChange={e => { setFilterZone(e.target.value); setFilterDistrict(''); }}
                                        >
                                            <option value="">All Zones (Regional Total)</option>
                                            {Object.entries(zones).map(([id, z]) => (
                                                <option key={id} value={id}>{z.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-[11px] font-bold text-muted uppercase ml-1">Woreda / District</label>
                                        <select
                                            className="input-field mt-1"
                                            value={filterDistrict}
                                            onChange={e => setFilterDistrict(e.target.value)}
                                            disabled={!filterZone}
                                        >
                                            <option value="">All Districts in Zone</option>
                                            {availableDistricts.map(([id, d]) => (
                                                <option key={id} value={id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        className="p-3 text-muted hover:text-red-500 transition-colors"
                                        onClick={() => { setFilterZone(''); setFilterDistrict(''); }}
                                        title="Clear Filters"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="card p-0 overflow-hidden shadow-2xl">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-slate-50 border-y border-slate-100">
                                                <th className="p-4 text-left text-[10px] font-black text-muted uppercase">KODHKA</th>
                                                <th className="p-4 text-left text-[10px] font-black text-muted uppercase">Ilaha Dakhliga</th>
                                                <th className="p-4 text-right text-[10px] font-black text-muted uppercase">Aggregated PLAN</th>
                                                <th className="p-4 text-right text-[10px] font-black text-muted uppercase">Aggregated ACTUAL</th>
                                                <th className="p-4 text-right text-[10px] font-black text-muted uppercase">Net Deficit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {REVENUE_CATEGORIES.map((cat, idx) => {
                                                if (cat.isHeader) {
                                                    return (
                                                        <tr key={idx} className="bg-accent/5">
                                                            <td colSpan="5" className="p-4 text-center font-black text-accent text-xs tracking-widest uppercase">
                                                                {cat.name}
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                                const id = cat.code || cat.name;
                                                const plan = aggregatedMonthly[id]?.plan || 0;
                                                const actual = aggregatedMonthly[id]?.actual || 0;
                                                const deficit = plan - actual;

                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-3 font-mono text-[11px] text-muted">{cat.code}</td>
                                                        <td className="p-3 font-bold text-text-main text-xs">{cat.name}</td>
                                                        <td className="p-3 text-right font-bold text-text-main text-xs">{plan.toLocaleString()}</td>
                                                        <td className="p-3 text-right font-bold text-text-main text-xs">{actual.toLocaleString()}</td>
                                                        <td className={`p-3 text-right text-xs font-black ${deficit > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                            {deficit.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {/* TOTAL ROW */}
                                            <tr className="bg-navy text-white font-black">
                                                <td className="p-4" colSpan="2">TOTAL REGIONAL/ZONE REVENUE</td>
                                                <td className="p-4 text-right">
                                                    {REVENUE_CATEGORIES.filter(c => !c.isHeader).reduce((sum, c) => sum + (aggregatedMonthly[c.code || c.name]?.plan || 0), 0).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {REVENUE_CATEGORIES.filter(c => !c.isHeader).reduce((sum, c) => sum + (aggregatedMonthly[c.code || c.name]?.actual || 0), 0).toLocaleString()}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {REVENUE_CATEGORIES.filter(c => !c.isHeader).reduce((sum, c) => sum + ((aggregatedMonthly[c.code || c.name]?.plan || 0) - (aggregatedMonthly[c.code || c.name]?.actual || 0)), 0).toLocaleString()}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                {Object.keys(aggregatedMonthly).length === 0 && (
                                    <div className="p-10 text-center text-muted italic bg-slate-50">
                                        No monthly reports found for the selected criteria.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div>
                            <h1 className="text-2xl font-extrabold text-text-main mb-8">System Settings</h1>

                            <div className="card border-l-4 border-red-500 bg-red-50/50">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-red-100 rounded-xl text-red-600">
                                        <AlertTriangle size={32} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-black text-red-700">Danger Zone</h3>
                                        <p className="text-sm text-red-600/80 mt-1 mb-4">
                                            The actions below are irreversible. Please proceed with extreme caution.
                                        </p>

                                        <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">Factory Reset</h4>
                                                    <p className="text-xs text-slate-500 mt-1 max-w-md">
                                                        Permanently delete ALL data including zones, districts, submissions, and financial reports.
                                                        The system will reset to its initial state.
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setShowResetConfirm(true)}
                                                    className="btn bg-red-600 hover:bg-red-700 text-white border-none shadow-lg shadow-red-200"
                                                >
                                                    <Trash2 size={16} />
                                                    Delete All Data
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Reset Confirmation Modal */}
                            {showResetConfirm && (
                                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>

                                        <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2">
                                            <AlertTriangle className="text-red-500" />
                                            Confirm Database Wipe
                                        </h3>

                                        <div className="text-sm text-slate-600 mb-8">
                                            <p className="mb-2 font-bold text-lg text-slate-800">Are you sure you want to delete <span className="text-red-600 decoration-wavy underline decoration-red-300">EVERYTHING</span>?</p>
                                            <p>This action cannot be undone. All collected data will be lost forever.</p>
                                        </div>

                                        <div className="flex gap-4">
                                            <button
                                                className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                                onClick={() => setShowResetConfirm(false)}
                                                disabled={isResetting}
                                            >
                                                No, Cancel
                                            </button>
                                            <button
                                                className="flex-1 py-3.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-red-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                disabled={isResetting}
                                                onClick={handleFactoryReset}
                                            >
                                                {isResetting ? 'Deleting...' : 'Yes, Delete All'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
