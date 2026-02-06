"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import NDVIChart from "@/components/NDVIChart";
import VCIGauge from "@/components/VCIGauge";
import ManagementZones from "@/components/ManagementZones";
import HistoricalBenchmark from "@/components/HistoricalBenchmark";
import EnhancedAlerts from "@/components/EnhancedAlerts";
import AnalyzeButton from "../analyze-button";
import { Calendar, MapPin, TrendingUp, AlertCircle, CheckCircle2, AlertTriangle, XCircle, Mountain, Lightbulb, Droplets, Leaf, Zap, Waves, Sprout, FlaskConical, Activity, Download, RefreshCw, Layers } from "lucide-react";

const FieldMap = dynamic(() => import("@/components/FieldMap"), { ssr: false });

interface FieldDashboardProps {
    fieldId: string;
    polygon: [number, number][];
    readings: any[];
    alerts?: any[];
    vciData?: any;
    managementZones?: any[];
    managementZoneDate?: string;
    benchmarkData?: any;
    statisticalData?: any;
}

export default function FieldDashboard({ 
    fieldId, 
    polygon, 
    readings,
    alerts = [],
    vciData,
    managementZones = [],
    managementZoneDate,
    benchmarkData,
    statisticalData
}: FieldDashboardProps) {
    const router = useRouter();
    const [mapUrl, setMapUrl] = useState<string | null>(null);
    const [mapLoading, setMapLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [mapBounds, setMapBounds] = useState<any>(null);
    const [selectedIndex, setSelectedIndex] = useState<string>("ndvi");
    const [terrainData, setTerrainData] = useState<any>(null);
    const [sarData, setSarData] = useState<any>(null);
    const [terrainLoading, setTerrainLoading] = useState(true);
    const [terrainError, setTerrainError] = useState<string | null>(null);
    const [generatingZones, setGeneratingZones] = useState(false);

    // Async data states
    const [vciDataState, setVciDataState] = useState<any>(vciData);
    const [vciLoading, setVciLoading] = useState(!vciData);
    const [benchmarkDataState, setBenchmarkDataState] = useState<any>(benchmarkData);
    const [benchmarkLoading, setBenchmarkLoading] = useState(!benchmarkData);

    // Fetch VCI data client-side if not provided
    useEffect(() => {
        if (!vciData) {
            setVciLoading(true);
            fetch(`/api/fields/${fieldId}/vci`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error("Failed to fetch VCI");
                })
                .then(data => {
                    if (data && !data.error) {
                        setVciDataState({
                            vci: data.vci || data.vci_mean, // handle structure variations
                            ndvi_current: data.ndvi_current,
                            severity: data.severity,
                            interpretation: data.interpretation,
                            recommendations: data.recommendations || []
                        });
                    }
                })
                .catch(e => console.log("VCI fetch skipped/failed:", e))
                .finally(() => setVciLoading(false));
        } else {
            setVciDataState(vciData);
            setVciLoading(false);
        }
    }, [fieldId, vciData]);

    // Fetch Benchmark data client-side if not provided
    useEffect(() => {
        if (!benchmarkData) {
            setBenchmarkLoading(true);
            fetch(`/api/fields/${fieldId}/benchmark`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error("Failed to fetch benchmark");
                })
                .then(data => {
                    if (data && !data.error && data.comparison_years) {
                        setBenchmarkDataState(data);
                    }
                })
                .catch(e => console.log("Benchmark fetch skipped/failed:", e))
                .finally(() => setBenchmarkLoading(false));
        } else {
            setBenchmarkDataState(benchmarkData);
            setBenchmarkLoading(false);
        }
    }, [fieldId, benchmarkData]);

    // Set initial selected date to latest reading
    useEffect(() => {
        if (readings.length > 0) {
            const latest = readings[readings.length - 1];
            setSelectedDate(latest.date);
        }
    }, [readings]);

    // Get unique dates from readings
    const uniqueDates = Array.from(new Set(readings.map(r => r.date)));

    // Fetch terrain analysis (once on mount)
    useEffect(() => {
        async function fetchTerrain() {
            setTerrainLoading(true);
            setTerrainError(null);
            try {
                console.log("Fetching terrain data for field:", fieldId);
                const res = await fetch(`/api/fields/${fieldId}/terrain`);
                console.log("Terrain API response status:", res.status);
                if (res.ok) {
                    const data = await res.json();
                    console.log("Terrain data received:", data);
                    setTerrainData(data);
                } else {
                    const error = await res.json();
                    console.error("Terrain API error:", res.status, error);
                    setTerrainError(error.error || `HTTP ${res.status}`);
                }
            } catch (e) {
                console.error("Terrain data fetch failed:", e);
                setTerrainError(e instanceof Error ? e.message : "Network error");
            } finally {
                setTerrainLoading(false);
            }
        }
        fetchTerrain();
    }, [fieldId]);

    // Fetch SAR moisture data when date changes
    useEffect(() => {
        if (!selectedDate) return;

        async function fetchSAR() {
            try {
                const res = await fetch(`/api/fields/${fieldId}/sar-moisture?date=${selectedDate}`);
                if (res.ok) {
                    const data = await res.json();
                    setSarData(data);
                }
            } catch (e) {
                console.error("SAR data unavailable", e);
            }
        }
        fetchSAR();
    }, [fieldId, selectedDate]);

    // Fetch map when date changes
    useEffect(() => {
        if (!selectedDate) return;

        async function fetchMap() {
            setMapLoading(true);
            try {
                const res = await fetch(`/api/fields/${fieldId}/map?date=${selectedDate}&index=${selectedIndex}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.url) {
                        setMapUrl(`${data.url}&t=${new Date().getTime()}`);
                        setMapBounds(data.bounds);
                        console.log(`Map loaded for date ${selectedDate}:`, data.fileName);
                    } else {
                        console.error(`Map URL missing for date ${selectedDate}:`, data);
                        setMapUrl(null);
                    }
                } else {
                    const errorData = await res.json();
                    console.error(`Failed to load map for date ${selectedDate}:`, res.status, errorData);
                    setMapUrl(null);
                }
            } catch (e) {
                console.error(`Failed to load map for date ${selectedDate}:`, e);
                setMapUrl(null);
            } finally {
                setMapLoading(false);
            }
        }

        fetchMap();
    }, [fieldId, selectedDate, selectedIndex]);

    // Prepare chart data
    const chartData = readings.map(r => ({
        date: r.date,
        mean: r.ndvi_mean
    }));

    // Calculate health status
    const latestReading = readings[readings.length - 1];

    // Handle Generate Zones
    const handleGenerateZones = async () => {
        setGeneratingZones(true);
        try {
            const res = await fetch(`/api/fields/${fieldId}/management-zones`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: new Date().toISOString(), threshold: 0.1 })
            });
            if (res.ok) {
                router.refresh();
            }
        } catch (e) {
            console.error('Generate zones error:', e);
        } finally {
            setGeneratingZones(false);
        }
    };

    // Handle Export VRA
    const handleExportVRA = async () => {
        try {
            const res = await fetch(`/api/fields/${fieldId}/management-zones?format=vra`);
            if (res.ok) {
                const vraMap = await res.json();
                const blob = new Blob([JSON.stringify(vraMap, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vra-map-${fieldId}-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error('Export VRA error:', e);
        }
    };
    const healthScore = latestReading?.ndvi_mean || 0;
    const healthStatus = healthScore >= 0.7 ? 'Healthy' : healthScore >= 0.4 ? 'Moderate' : 'High Stress';
    const healthColor = healthScore >= 0.7 ? 'bg-green-100 text-green-700 border-green-300' :
        healthScore >= 0.4 ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
            'bg-red-100 text-red-700 border-red-300';
    const HealthIcon = healthScore >= 0.7 ? CheckCircle2 : healthScore >= 0.4 ? AlertTriangle : XCircle;
    const healthIconColor = healthScore >= 0.7 ? 'text-green-600' : healthScore >= 0.4 ? 'text-yellow-600' : 'text-red-600';

    // Calculate center of polygon for location
    const centerLat = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
    const centerLng = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;

    return (
        <div className="min-h-screen bg-stone-50 pb-20">
            {/* Compact Header */}
            <div className="bg-amber-700 text-white px-5 py-5 mb-6">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-2xl font-bold tracking-tight mb-0.5">Field Analysis</h1>
                    <p className="text-amber-100 text-base font-medium">शेत विश्लेषण</p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 space-y-5">
                {/* Date & Location Bar */}
                <div className="bg-white rounded-xl p-4 border-2 border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-amber-600" strokeWidth={2.5} />
                        <select
                            className="bg-white border-2 border-stone-300 rounded-xl px-4 py-2.5 font-bold text-base text-stone-900 cursor-pointer focus:border-amber-600 focus:outline-none"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        >
                            {uniqueDates.slice().reverse().map(date => (
                                <option key={date} value={date}>
                                    {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 text-stone-700">
                        <MapPin className="w-5 h-5" strokeWidth={2.5} />
                        <span className="font-medium text-base">{centerLat.toFixed(4)}° N, {centerLng.toFixed(4)}° E</span>
                    </div>
                </div>

                {/* Index Selector - Compact and Clear */}
                <div className="bg-white rounded-xl p-4 border-2 border-stone-200">
                    <h3 className="font-bold text-stone-900 mb-3 text-base">Analysis Type</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <button
                            onClick={() => setSelectedIndex("ndvi")}
                            className={`px-3 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
                                selectedIndex === "ndvi"
                                    ? "bg-green-600 text-white border-2 border-green-700"
                                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                            }`}
                        >
                            <Leaf className="w-4 h-4" strokeWidth={2.5} />
                            <span>NDVI</span>
                        </button>
                        <button
                            onClick={() => setSelectedIndex("ndmi")}
                            className={`px-3 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
                                selectedIndex === "ndmi"
                                    ? "bg-sky-600 text-white border-2 border-sky-700"
                                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                            }`}
                        >
                            <Droplets className="w-4 h-4" strokeWidth={2.5} />
                            <span>NDMI</span>
                        </button>
                        <button
                            onClick={() => setSelectedIndex("ndre")}
                            className={`px-3 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
                                selectedIndex === "ndre"
                                    ? "bg-amber-600 text-white border-2 border-amber-700"
                                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                            }`}
                        >
                            <Zap className="w-4 h-4" strokeWidth={2.5} />
                            <span>NDRE</span>
                        </button>
                        <button
                            onClick={() => setSelectedIndex("ndwi")}
                            className={`px-3 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
                                selectedIndex === "ndwi"
                                    ? "bg-cyan-600 text-white border-2 border-cyan-700"
                                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                            }`}
                        >
                            <Waves className="w-4 h-4" strokeWidth={2.5} />
                            <span>NDWI</span>
                        </button>
                        <button
                            onClick={() => setSelectedIndex("evi")}
                            className={`px-3 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
                                selectedIndex === "evi"
                                    ? "bg-emerald-600 text-white border-2 border-emerald-700"
                                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                            }`}
                        >
                            <Sprout className="w-4 h-4" strokeWidth={2.5} />
                            <span>EVI</span>
                        </button>
                        <button
                            onClick={() => setSelectedIndex("arvi")}
                            className={`px-3 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
                                selectedIndex === "arvi"
                                    ? "bg-purple-600 text-white border-2 border-purple-700"
                                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                            }`}
                        >
                            <FlaskConical className="w-4 h-4" strokeWidth={2.5} />
                            <span>ARVI</span>
                        </button>
                        <button
                            onClick={() => setSelectedIndex("mcari")}
                            className={`px-3 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
                                selectedIndex === "mcari"
                                    ? "bg-pink-600 text-white border-2 border-pink-700"
                                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                            }`}
                        >
                            <Activity className="w-4 h-4" strokeWidth={2.5} />
                            <span>MCARI</span>
                        </button>
                        <button
                            onClick={() => setSelectedIndex("psri")}
                            className={`px-3 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
                                selectedIndex === "psri"
                                    ? "bg-red-600 text-white border-2 border-red-700"
                                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                            }`}
                        >
                            <AlertCircle className="w-4 h-4" strokeWidth={2.5} />
                            <span>PSRI</span>
                        </button>
                    </div>
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border-2 border-amber-200">
                        <p className="text-sm font-bold text-stone-800">
                        {selectedIndex === "ndvi" && "Vegetation health and vigor"}
                        {selectedIndex === "ndmi" && "Water stress & moisture content"}
                        {selectedIndex === "ndre" && "Early stress detection (sensitive)"}
                        {selectedIndex === "ndwi" && "Water & moisture detection"}
                        {selectedIndex === "evi" && "Enhanced vegetation (atmospheric corrected)"}
                        {selectedIndex === "arvi" && "Disease detection (atmospheric resistant)"}
                        {selectedIndex === "mcari" && "Chlorophyll/disease stress (research-grade)"}
                        {selectedIndex === "psri" && "Nutrient stress & plant aging"}
                        </p>
                    </div>
                </div>

                {/* Health Legend - Compact */}
                <div className="bg-white rounded-xl p-4 border-2 border-stone-200">
                    <h3 className="font-bold text-stone-900 flex items-center gap-2 mb-3 text-base">
                        <TrendingUp className="w-5 h-5 text-amber-600" strokeWidth={2.5} />
                        Health Guide
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center gap-2 p-2.5 bg-red-50 rounded-lg border-2 border-red-200">
                            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
                                <XCircle className="w-5 h-5 text-white" strokeWidth={2.5} />
                            </div>
                            <span className="text-xs font-bold text-red-700">High Stress</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 p-2.5 bg-amber-50 rounded-lg border-2 border-amber-200">
                            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-white" strokeWidth={2.5} />
                            </div>
                            <span className="text-xs font-bold text-amber-700">Moderate</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 p-2.5 bg-green-50 rounded-lg border-2 border-green-200">
                            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.5} />
                            </div>
                            <span className="text-xs font-bold text-green-700">Healthy</span>
                        </div>
                    </div>
                </div>

                {/* Satellite Map */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="aspect-square bg-gray-900 relative">
                        {mapLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-3"></div>
                                    <span className="text-sm">Loading satellite image...</span>
                                </div>
                            </div>
                        ) : mapUrl ? (
                            <>
                                <div className="absolute inset-0 overflow-hidden">
                                    <img 
                                        src={mapUrl} 
                                        alt="Field Sentinel Map" 
                                        className="w-full h-full object-cover"
                                        style={{
                                            transform: 'scale(3)',
                                            transformOrigin: 'center center'
                                        }}
                                    />
                                </div>
                                {/* Field Boundary & Zone Overlays */}
                                {mapBounds && (
                                    <svg 
                                        className="absolute inset-0 w-full h-full pointer-events-none" 
                                        viewBox="0 0 100 100" 
                                        preserveAspectRatio="none"
                                        style={{
                                            transform: 'scale(3)',
                                            transformOrigin: 'center center'
                                        }}
                                    >
                                        {/* Field Boundary - dashed outline */}
                                        <polygon 
                                            points={polygon.map((p) => {
                                                const x = ((p[1] - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100;
                                                const y = ((mapBounds.maxLat - p[0]) / (mapBounds.maxLat - mapBounds.minLat)) * 100;
                                                return `${x},${y}`;
                                            }).join(' ')}
                                            fill="none"
                                            stroke="#3b82f6"
                                            strokeWidth="0.6"
                                            strokeDasharray="2,1.5"
                                            opacity="1"
                                        />
                                    </svg>
                                )}
                                
                                {/* Legend */}
                                <div className="absolute top-2 right-2 bg-black bg-opacity-80 text-white text-xs px-3 py-2 rounded-lg space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-0.5 border-t-2 border-dashed border-blue-400"></div>
                                        <span>Field Boundary</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <span>Select a date to view imagery</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Field Health Status Card - PROMINENT */}
                <div className={`bg-white rounded-xl p-5 border-4 ${healthScore >= 0.7 ? 'border-green-500' : healthScore >= 0.4 ? 'border-amber-500' : 'border-red-500'} shadow-lg`}>
                    <div className="flex items-start gap-4 mb-4">
                        <div className={`p-3 rounded-xl ${healthScore >= 0.7 ? 'bg-green-100' : healthScore >= 0.4 ? 'bg-amber-100' : 'bg-red-100'}`}>
                            <HealthIcon className={`w-9 h-9 ${healthIconColor}`} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-bold text-xl text-stone-900">Field Health</h3>
                                <span className={`font-bold text-base px-3 py-1.5 rounded-lg ${healthScore >= 0.7 ? 'bg-green-100 text-green-700 border-2 border-green-400' : healthScore >= 0.4 ? 'bg-amber-100 text-amber-700 border-2 border-amber-400' : 'bg-red-100 text-red-700 border-2 border-red-400'}`}>
                                    {healthStatus}
                                </span>
                            </div>
                            <p className="text-sm text-stone-600 font-medium mb-3">शेत आरोग्य</p>
                            <p className="text-base text-stone-800 leading-relaxed font-medium">
                                {healthScore >= 0.7
                                    ? `Excellent crop health. NDVI: ${healthScore.toFixed(2)}`
                                    : healthScore >= 0.4
                                        ? `Moderate stress detected. Check red zones on map.`
                                        : `High stress. Immediate action needed. NDVI: ${healthScore.toFixed(2)}`
                                }
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-3 border-t-2 border-stone-200">
                        <button 
                            onClick={() => router.push('/coming-soon')}
                            className="flex-1 bg-white border-2 border-emerald-600 text-emerald-700 rounded-xl py-3 font-bold text-base hover:bg-emerald-50 active:scale-[0.98] transition-all"
                        >
                            View Report
                        </button>
                        <button 
                            onClick={() => router.push('/coming-soon')}
                            className="flex-1 bg-amber-600 text-white rounded-xl py-3 font-bold text-base hover:bg-amber-700 active:scale-[0.98] transition-all border-2 border-amber-700"
                        >
                            Get Advice
                        </button>
                    </div>
                </div>

                {/* Enhanced Alerts Section */}
                {(alerts.length > 0 || statisticalData) && (
                    <div className="bg-white rounded-xl p-5 border-2 border-red-200 shadow-md">
                        <h3 className="font-bold text-stone-900 text-lg mb-4 flex items-center gap-2">
                            <AlertCircle className="w-6 h-6 text-red-600" strokeWidth={2.5} />
                            Active Alerts & Anomalies
                        </h3>
                        <EnhancedAlerts alerts={alerts} statistics={statisticalData} />
                    </div>
                )}

                {/* Advanced Features Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {/* VCI Gauge */}
                    {vciLoading ? (
                         <div className="bg-white rounded-xl p-5 border-2 border-stone-100 shadow-md h-full min-h-[300px] flex flex-col items-center justify-center gap-3 animate-pulse">
                            <div className="w-12 h-12 bg-stone-200 rounded-full"></div>
                            <div className="h-4 w-32 bg-stone-200 rounded"></div>
                            <div className="text-sm text-stone-400">Analyzing drought conditions...</div>
                        </div>
                    ) : vciDataState && (
                        <VCIGauge
                            vci={vciDataState.vci}
                            ndvi_current={vciDataState.ndvi_current}
                            severity={vciDataState.severity}
                            interpretation={vciDataState.interpretation}
                            recommendations={vciDataState.recommendations}
                        />
                    )}

                    {/* Management Zones - Full width when alone */}
                    <div className={(!vciDataState && !vciLoading) ? "xl:col-span-2" : ""}>
                        {managementZones.length > 0 && managementZoneDate ? (
                            <ManagementZones
                                zones={managementZones}
                                analysisDate={managementZoneDate}
                                polygon={polygon}
                                onExportVRA={handleExportVRA}
                            />
                        ) : (
                            <div className="bg-white rounded-xl p-5 border-2 border-purple-200 shadow-md">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-purple-100 rounded-lg p-2">
                                        <Activity className="w-6 h-6 text-purple-700" strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-stone-900 text-lg">Management Zones</h3>
                                        <p className="text-sm text-stone-600">Generate productivity zones</p>
                                    </div>
                                </div>
                                <div className="text-center py-6">
                                    <p className="text-stone-600 mb-4">No zones generated yet</p>
                                    <button
                                        onClick={handleGenerateZones}
                                        disabled={generatingZones}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 mx-auto"
                                    >
                                        {generatingZones ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Activity className="w-4 h-4" />
                                                Generate Zones
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Historical Benchmark */}
                {benchmarkLoading ? (
                     <div className="bg-white rounded-xl p-5 border-2 border-stone-100 shadow-md h-64 flex flex-col items-center justify-center gap-3 animate-pulse">
                        <div className="w-16 h-16 bg-stone-200 rounded-md"></div>
                        <div className="h-4 w-48 bg-stone-200 rounded"></div>
                        <div className="text-sm text-stone-400">Comparing with historical seasons...</div>
                    </div>
                ) : benchmarkDataState && (
                    <HistoricalBenchmark data={benchmarkDataState} />
                )}

                {/* Advanced Context Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Terrain Risk Card */}
                    {terrainData ? (
                        <div className="bg-white rounded-xl p-4 border-2 border-purple-200 shadow-md" style={{borderLeftWidth: '4px', borderLeftColor: '#a855f7'}}>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="bg-purple-100 rounded-lg p-2">
                                    <Mountain className="w-5 h-5 text-purple-700" strokeWidth={2.5} />
                                </div>
                                <h3 className="font-bold text-stone-900 text-base">Terrain</h3>
                            </div>
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-stone-700 font-medium text-sm">Elevation</span>
                                    <span className="font-bold text-stone-900 text-sm">{terrainData.elevation.min}m - {terrainData.elevation.max}m</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-stone-700 font-medium text-sm">Slope</span>
                                    <span className="font-bold text-stone-900 text-sm">{terrainData.slope.mean}°</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-3">
                                    <div className={`text-center p-2 rounded-lg font-bold text-xs ${terrainData.risks.waterlogging === 'high' ? 'bg-red-100 text-red-700 border-2 border-red-300' : terrainData.risks.waterlogging === 'medium' ? 'bg-amber-100 text-amber-700 border-2 border-amber-300' : 'bg-green-100 text-green-700 border-2 border-green-300'}`}>
                                        <div className="text-xs mb-0.5">Waterlog</div>
                                        <div className="capitalize">{terrainData.risks.waterlogging}</div>
                                    </div>
                                    <div className={`text-center p-2 rounded-lg font-bold text-xs ${terrainData.risks.runoff === 'high' ? 'bg-red-100 text-red-700 border-2 border-red-300' : terrainData.risks.runoff === 'medium' ? 'bg-amber-100 text-amber-700 border-2 border-amber-300' : 'bg-green-100 text-green-700 border-2 border-green-300'}`}>
                                        <div className="text-xs mb-0.5">Runoff</div>
                                        <div className="capitalize">{terrainData.risks.runoff}</div>
                                    </div>
                                    <div className={`text-center p-2 rounded-lg font-bold text-xs ${terrainData.risks.erosion === 'high' ? 'bg-red-100 text-red-700 border-2 border-red-300' : terrainData.risks.erosion === 'medium' ? 'bg-amber-100 text-amber-700 border-2 border-amber-300' : 'bg-green-100 text-green-700 border-2 border-green-300'}`}>
                                        <div className="text-xs mb-0.5">Erosion</div>
                                        <div className="capitalize">{terrainData.risks.erosion}</div>
                                    </div>
                                </div>
                                {terrainData.recommendations.length > 0 && (
                                    <div className="mt-3 p-2.5 bg-purple-50 rounded-lg text-xs text-stone-700 font-medium border-2 border-purple-200">
                                        <div className="flex items-start gap-2">
                                            <Lightbulb className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" strokeWidth={2.5} />
                                            <span>{terrainData.recommendations[0]}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : terrainLoading ? (
                        <div className="bg-white rounded-xl p-4 border-2 border-stone-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Mountain className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
                                <h3 className="font-bold text-stone-900 text-base">Terrain</h3>
                            </div>
                            <div className="flex items-center justify-center py-6 text-stone-500">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                            </div>
                        </div>
                    ) : terrainError ? (
                        <div className="bg-white rounded-xl p-4 border-2 border-red-300">
                            <div className="flex items-center gap-2 mb-3">
                                <Mountain className="w-5 h-5 text-purple-600" strokeWidth={2.5} />
                                <h3 className="font-bold text-stone-900 text-base">Terrain</h3>
                            </div>
                            <div className="text-sm text-red-700 p-3 bg-red-50 rounded-lg border-2 border-red-200">
                                <div className="font-bold mb-1 flex items-center gap-1.5">
                                    <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
                                    <span>Data Unavailable</span>
                                </div>
                                <div className="text-xs">{terrainError}</div>
                            </div>
                        </div>
                    ) : null}

                    {/* SAR Moisture Card */}
                    {sarData && (
                        <div className="card p-5" style={{borderLeft: '4px solid #06b6d4'}}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-cyan-100 rounded-xl p-3">
                                    <Waves className="w-6 h-6 text-cyan-700" strokeWidth={2.5} />
                                </div>
                                <h3 className="font-bold text-stone-900 text-lg">Radar Monitoring</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-stone-700 font-medium">Status:</span>
                                    <span className={`font-bold px-3 py-2 rounded-xl text-sm ${sarData.moistureLevel === 'wet' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : sarData.moistureLevel === 'dry' ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-amber-100 text-amber-700 border-2 border-amber-300'}`}>
                                        {sarData.moistureLevel.toUpperCase()}
                                    </span>
                                </div>
                                <div className="text-sm text-stone-700 font-medium mt-3 p-3 bg-cyan-50 rounded-xl">
                                    {sarData.message}
                                </div>
                                <div className="mt-3 space-y-2">
                                    {sarData.advantages.map((adv: string, i: number) => (
                                        <div key={i} className="text-sm text-stone-700 flex items-start gap-2">
                                            <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full mt-2 shrink-0"></div>
                                            <span>{adv}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* NDVI Chart */}
                <div className="bg-white rounded-xl border-2 border-stone-200 shadow-md p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-stone-900 text-base">NDVI Trends</h3>
                        <AnalyzeButton fieldId={fieldId} />
                    </div>
                    <div className="h-64">
                        {chartData.length > 0 ? (
                            <NDVIChart data={chartData} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-stone-500">
                                <div className="text-center">
                                    <p className="font-medium mb-2">No data available</p>
                                    <p className="text-sm">Run analysis to see trends</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
