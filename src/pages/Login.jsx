import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { seedDatabase } from '../lib/seed';
import logo from '../assets/logo.png';

export default function Login() {
    const { login } = useAuth();

    // Data States
    const [zones, setZones] = useState({});
    const [allDistricts, setAllDistricts] = useState({});
    const [isSeeding, setIsSeeding] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Selection States
    const [userType, setUserType] = useState(''); // 'admin' or 'zones'
    const [selectedZoneId, setSelectedZoneId] = useState('');
    const [selectedDistrictId, setSelectedDistrictId] = useState('');

    // Form States
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // 1. Data Synchronization & Auto-Setup
    useEffect(() => {
        let isMounted = true;

        const zonesRef = ref(db, 'zones');
        const unsubZones = onValue(zonesRef, (snapshot) => {
            if (!isMounted) return;

            if (snapshot.exists()) {
                setZones(snapshot.val());
                setIsInitialLoad(false);
            } else {
                // If it's been 2 seconds and we still have no data, auto-seed
                const timer = setTimeout(() => {
                    if (isMounted && !isSeeding) {
                        setIsSeeding(true);
                        seedDatabase().finally(() => {
                            if (isMounted) {
                                setIsSeeding(false);
                                setIsInitialLoad(false);
                            }
                        });
                    }
                }, 2000);
                return () => clearTimeout(timer);
            }
        });

        const districtsRef = ref(db, 'districts');
        const unsubDistricts = onValue(districtsRef, (snapshot) => {
            if (isMounted && snapshot.exists()) {
                setAllDistricts(snapshot.val());
            }
        });

        return () => {
            isMounted = false;
            unsubZones();
            unsubDistricts();
        };
    }, [isSeeding]);

    // 2. Filter Districts Local Logic
    const filteredDistricts = useMemo(() => {
        if (!selectedZoneId) return [];
        return Object.entries(allDistricts)
            .filter(([_, d]) => d.zoneId === selectedZoneId)
            .sort((a, b) => a[1].name.localeCompare(b[1].name));
    }, [allDistricts, selectedZoneId]);

    // 3. Flow Side Effects
    useEffect(() => {
        setSelectedDistrictId('');
        setUsername('');
    }, [selectedZoneId]);

    useEffect(() => {
        if (selectedDistrictId && allDistricts[selectedDistrictId]) {
            setUsername(allDistricts[selectedDistrictId].username);
        }
    }, [selectedDistrictId, allDistricts]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (userType === 'zones' && (!selectedZoneId || !selectedDistrictId)) {
            setError('Fadlan dooro Gobolka iyo Degmada');
            return;
        }

        if (!username || !password) {
            setError('Fadlan geli furahaaga');
            return;
        }

        setLoading(true);
        const res = await login(username, password);
        if (!res.success) {
            setError(res.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen login-bg-interactive flex items-center justify-center p-4 relative overflow-hidden">
            <div className="w-full max-w-[360px] relative z-10 text-center">
                {/* Clean White Card Section */}
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full mx-auto" style={{ backgroundColor: '#ffffff', color: '#1E293B' }}>
                    {/* Progress indicator */}
                    {(isInitialLoad || isSeeding) && (
                        <div className="absolute top-0 left-0 w-full h-1 bg-slate-50">
                            <div className="h-full bg-accent animate-progress"></div>
                        </div>
                    )}

                    {/* Integrated Branding Section */}
                    <div className="relative flex flex-col items-center mb-6">
                        {/* Logo Circle */}
                        <div className="mb-4">
                            <div className="w-16 h-16 flex items-center justify-center bg-blue-50/50 rounded-full p-1">
                                <img src={logo} alt="Office Logo" className="w-full h-full object-contain" />
                            </div>
                        </div>

                        {/* Text integrated below */}
                        <div className="text-center space-y-1">
                            <h1 className="text-slate-900 font-bold text-lg leading-tight">
                                Xafiiska dakhliga DDS
                            </h1>
                            <h2 className="text-slate-400 font-medium text-sm">
                                Xogta Qorshaynta
                            </h2>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 px-2">

                        {error && (
                            <div className="p-1.5 bg-white border border-red-500/10 text-red-600 text-[9px] rounded-md font-bold text-center animate-shake">
                                {error}
                            </div>
                        )}

                        {/* Account Type */}
                        <div className="space-y-1">
                            <select
                                className="w-full p-3 text-sm border border-gray-300 rounded text-gray-600 outline-none focus:border-amber-500 transition-all bg-white"
                                value={userType}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setUserType(val);
                                    setError('');
                                    setSelectedZoneId('');
                                    setSelectedDistrictId('');
                                    setUsername(val === 'admin' ? 'admin' : '');
                                    setPassword('');
                                }}
                                required
                            >
                                <option value="">Select Account Type...</option>
                                <option value="admin" className="font-bold">Regional Admin (Admin)</option>
                                <option value="zones" className="font-bold">District Level (Zones)</option>
                            </select>
                        </div>

                        {/* Step 2: Cascading Selection */}
                        {userType === 'zones' && (
                            <div className="space-y-1.5 animate-fade-in border-l-2 border-slate-100 pl-2">
                                <div className="space-y-1">
                                    <select
                                        className="w-full p-3 text-sm border border-gray-300 rounded text-gray-600 outline-none focus:border-amber-500 transition-all bg-white"
                                        value={selectedZoneId}
                                        onChange={(e) => setSelectedZoneId(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Dooro Gobolka --</option>
                                        {Object.entries(zones).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([id, z]) => (
                                            <option key={id} value={id} className="font-bold">{z.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <select
                                        className="w-full p-3 text-sm border border-gray-300 rounded text-gray-600 outline-none focus:border-amber-500 transition-all bg-white"
                                        value={selectedDistrictId}
                                        onChange={(e) => setSelectedDistrictId(e.target.value)}
                                        disabled={!selectedZoneId}
                                        required
                                    >
                                        <option value="">
                                            {selectedZoneId
                                                ? (filteredDistricts.length > 0 ? "-- Dooro Degmada --" : "Ma jiro xog (No districts found)")
                                                : "-- Dooro Gobolka Marka Hore --"
                                            }
                                        </option>
                                        {filteredDistricts.map(([id, d]) => (
                                            <option key={id} value={id} className="font-bold">{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Password Only */}
                        <div className={`space-y-1.5 transition-all duration-500 ${userType ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                            <div className="space-y-1">
                                <input
                                    type="password"
                                    className="w-full p-3 text-sm border border-gray-300 rounded text-gray-600 outline-none focus:border-amber-500 transition-all placeholder:text-gray-400"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !userType || (userType === 'zones' && !selectedDistrictId)}
                            className="w-full bg-[#D4A017] hover:bg-[#b88b14] text-white font-bold py-3 rounded text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
                        >
                            {loading ? 'Entering System...' : 'Enter System'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Bureau of Revenue • Somali Regional State</span>
                    </div>
                </div>

                {/* Subtle repair trigger if data is missing after timeout */}
                {!isInitialLoad && Object.keys(zones).length === 0 && (
                    <button
                        onClick={() => seedDatabase()}
                        className="mt-4 text-[10px] text-slate-300 hover:text-accent transition-colors uppercase font-bold"
                    >
                        Setup Connection
                    </button>
                )}
            </div>
        </div>
    );
}
