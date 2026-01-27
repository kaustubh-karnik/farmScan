"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import NDVIChart from "@/components/NDVIChart";
import AnalyzeButton from "../analyze-button";
import { Calendar, MapPin, TrendingUp, AlertCircle } from "lucide-react";

const FieldMap = dynamic(() => import("@/components/FieldMap"), { ssr: false });

interface FieldDashboardProps {
    fieldId: string;
    polygon: [number, number][];
    readings: any[];
}

export default function FieldDashboard({ fieldId, polygon, readings }: FieldDashboardProps) {
    const [mapUrl, setMapUrl] = useState<string | null>(null);
    const [mapLoading, setMapLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [mapBounds, setMapBounds] = useState<any>(null);
    const [selectedIndex, setSelectedIndex] = useState<string>("ndvi");
    const [terrainData, setTerrainData] = useState<any>(null);
    const [sarData, setSarData] = useState<any>(null);
    const [terrainLoading, setTerrainLoading] = useState(true);
    const [terrainError, setTerrainError] = useState<string | null>(null);

    // Set initial selected date to latest reading
    useEffect(() => {
        if (readings.length > 0) {
            const latest = readings[readings.length - 1];
            setSelectedDate(latest.date);
        }
    }, [readings]);

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
    const healthScore = latestReading?.ndvi_mean || 0;
    const healthStatus = healthScore >= 0.7 ? 'Healthy' : healthScore >= 0.4 ? 'Moderate' : 'High Stress';
    const healthColor = healthScore >= 0.7 ? 'bg-green-100 text-green-700 border-green-300' :
        healthScore >= 0.4 ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
            'bg-red-100 text-red-700 border-red-300';
    const healthIcon = healthScore >= 0.7 ? '💚' : healthScore >= 0.4 ? '⚠️' : '❗';

    // Calculate center of polygon for location
    const centerLat = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
    const centerLng = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-4 shadow-lg mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold">Field Analysis</h1>
                    <button className="p-2 hover:bg-orange-700 rounded-lg transition-colors">
                        <span className="text-xl">☰</span>
                    </button>
                </div>
                <p className="text-orange-100 text-sm">शेत विश्लेषण</p>
            </div>

            <div className="max-w-6xl mx-auto px-4 space-y-6">
                {/* Date & Location Bar */}
                <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-orange-600" />
                        <select
                            className="font-semibold text-gray-800 bg-transparent border-none focus:outline-none cursor-pointer"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        >
                            {readings.slice().reverse().map(r => (
                                <option key={r.id} value={r.date}>
                                    {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{centerLat.toFixed(4)}° N, {centerLng.toFixed(4)}° E</span>
                    </div>
                </div>

                {/* Index Selector */}
                <div className="bg-white rounded-xl shadow-md p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-gray-800">Select Index</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setSelectedIndex("ndvi")}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                selectedIndex === "ndvi"
                                    ? "bg-green-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            🌱 NDVI
                        </button>
                        <button
                            onClick={() => setSelectedIndex("ndmi")}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                selectedIndex === "ndmi"
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            💧 NDMI
                        </button>
                        <button
                            onClick={() => setSelectedIndex("ndre")}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                selectedIndex === "ndre"
                                    ? "bg-orange-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            🍃 NDRE
                        </button>
                        <button
                            onClick={() => setSelectedIndex("ndwi")}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                selectedIndex === "ndwi"
                                    ? "bg-cyan-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            🌊 NDWI
                        </button>
                        <button
                            onClick={() => setSelectedIndex("evi")}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                selectedIndex === "evi"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            🌿 EVI
                        </button>
                        <button
                            onClick={() => setSelectedIndex("arvi")}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                selectedIndex === "arvi"
                                    ? "bg-purple-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            🔬 ARVI
                        </button>
                        <button
                            onClick={() => setSelectedIndex("mcari")}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                selectedIndex === "mcari"
                                    ? "bg-pink-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            🧬 MCARI
                        </button>
                        <button
                            onClick={() => setSelectedIndex("psri")}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                selectedIndex === "psri"
                                    ? "bg-amber-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                        >
                            🍂 PSRI
                        </button>
                    </div>
                    <div className="mt-3 text-xs text-gray-600">
                        {selectedIndex === "ndvi" && "Vegetation health and vigor"}
                        {selectedIndex === "ndmi" && "Water stress & moisture content"}
                        {selectedIndex === "ndre" && "Early stress detection (sensitive)"}
                        {selectedIndex === "ndwi" && "Water & moisture detection"}
                        {selectedIndex === "evi" && "Enhanced vegetation (atmospheric corrected)"}
                        {selectedIndex === "arvi" && "Disease detection (atmospheric resistant)"}
                        {selectedIndex === "mcari" && "Chlorophyll/disease stress (research-grade)"}
                        {selectedIndex === "psri" && "Nutrient stress & plant aging"}
                    </div>
                </div>

                {/* NDVI Legend */}
                <div className="bg-white rounded-xl shadow-md p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-gray-800 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-orange-600" />
                            NDVI Index
                        </span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                                <span className="text-white text-xs">🔴</span>
                            </div>
                            <span className="text-sm text-gray-700">High Stress</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                                <span className="text-white text-xs">🟡</span>
                            </div>
                            <span className="text-sm text-gray-700">Moderate</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                <span className="text-white text-xs">🟢</span>
                            </div>
                            <span className="text-sm text-gray-700">Healthy</span>
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
                                <img src={mapUrl} alt="Field Sentinel Map" className="w-full h-full object-cover" />
                                {/* Field Boundary Overlay */}
                                {mapBounds && (
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <polygon 
                                            points={polygon.map((p) => {
                                                // Map field coordinates to the expanded bounds
                                                const x = ((p[1] - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100;
                                                const y = ((mapBounds.maxLat - p[0]) / (mapBounds.maxLat - mapBounds.minLat)) * 100;
                                                return `${x},${y}`;
                                            }).join(' ')}
                                            fill="none"
                                            stroke="#3b82f6"
                                            strokeWidth="0.8"
                                            strokeDasharray="3,2"
                                            opacity="1"
                                        />
                                    </svg>
                                )}
                                {/* Legend for boundary */}
                                <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                    <div className="w-4 h-0.5 border-t-2 border-dashed border-blue-400"></div>
                                    <span>Field Boundary</span>
                                </div>
                            </>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <span>Select a date to view imagery</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Field Health Status Card */}
                <div className={`rounded-xl shadow-md p-6 border-2 ${healthColor}`}>
                    <div className="flex items-start gap-4">
                        <div className="text-4xl">{healthIcon}</div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-lg">Field Health</h3>
                                <span className="font-bold text-xl">{healthStatus}</span>
                            </div>
                            <p className="text-sm mb-3">शेत आरोग्य</p>
                            <p className="text-sm mb-4">
                                {healthScore >= 0.7
                                    ? `Excellent crop health detected across the field. NDVI: ${healthScore.toFixed(2)}`
                                    : healthScore >= 0.4
                                        ? `Moderate crop stress detected in ${Math.round((1 - healthScore) * 50)}% of field area. Consider irrigation in red zones.`
                                        : `High stress detected. Immediate action recommended. NDVI: ${healthScore.toFixed(2)}`
                                }
                            </p>
                            {healthScore >= 0.4 && (
                                <p className="text-xs italic">
                                    मध्यम पीक ताण • ​शेतात लालभात आकार्षण विचारात घ्या
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button className="flex-1 bg-white border-2 border-current py-2 px-4 rounded-lg font-semibold hover:bg-opacity-10 transition-colors">
                            View Report
                        </button>
                        <button className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-orange-700 transition-colors">
                            Get Advice
                        </button>
                    </div>
                </div>

                {/* Advanced Context Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Terrain Risk Card */}
                    {terrainData ? (
                        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-purple-500">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">🏔️</span>
                                <h3 className="font-bold text-gray-800">Terrain Analysis</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Elevation:</span>
                                    <span className="font-semibold">{terrainData.elevation.min}m - {terrainData.elevation.max}m</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Slope:</span>
                                    <span className="font-semibold">{terrainData.slope.mean}°</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mt-3">
                                    <div className={`text-center p-2 rounded ${terrainData.risks.waterlogging === 'high' ? 'bg-red-100 text-red-700' : terrainData.risks.waterlogging === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                        <div className="text-xs font-semibold">Waterlog</div>
                                        <div className="text-xs">{terrainData.risks.waterlogging}</div>
                                    </div>
                                    <div className={`text-center p-2 rounded ${terrainData.risks.runoff === 'high' ? 'bg-red-100 text-red-700' : terrainData.risks.runoff === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                        <div className="text-xs font-semibold">Runoff</div>
                                        <div className="text-xs">{terrainData.risks.runoff}</div>
                                    </div>
                                    <div className={`text-center p-2 rounded ${terrainData.risks.erosion === 'high' ? 'bg-red-100 text-red-700' : terrainData.risks.erosion === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                        <div className="text-xs font-semibold">Erosion</div>
                                        <div className="text-xs">{terrainData.risks.erosion}</div>
                                    </div>
                                </div>
                                {terrainData.recommendations.length > 0 && (
                                    <div className="mt-3 p-2 bg-purple-50 rounded text-xs text-gray-700">
                                        💡 {terrainData.recommendations[0]}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : terrainLoading ? (
                        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-gray-300">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">🏔️</span>
                                <h3 className="font-bold text-gray-800">Terrain Analysis</h3>
                            </div>
                            <div className="flex items-center justify-center py-8 text-gray-500">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                            </div>
                        </div>
                    ) : terrainError ? (
                        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-red-500">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">🏔️</span>
                                <h3 className="font-bold text-gray-800">Terrain Analysis</h3>
                            </div>
                            <div className="text-sm text-red-600 p-3 bg-red-50 rounded">
                                <div className="font-semibold mb-1">⚠️ Data Unavailable</div>
                                <div className="text-xs">{terrainError}</div>
                            </div>
                        </div>
                    ) : null}

                    {/* SAR Moisture Card */}
                    {sarData && (
                        <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-cyan-500">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-2xl">📡</span>
                                <h3 className="font-bold text-gray-800">Radar Monitoring</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Status:</span>
                                    <span className={`font-semibold px-2 py-1 rounded ${sarData.moistureLevel === 'wet' ? 'bg-blue-100 text-blue-700' : sarData.moistureLevel === 'dry' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {sarData.moistureLevel.toUpperCase()}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-600 mt-2">
                                    {sarData.message}
                                </div>
                                <div className="mt-3 space-y-1">
                                    {sarData.advantages.map((adv: string, i: number) => (
                                        <div key={i} className="text-xs text-gray-600 flex items-start gap-1">
                                            <span>{adv}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* NDVI Chart */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800">NDVI Trends</h3>
                        <AnalyzeButton fieldId={fieldId} />
                    </div>
                    <div className="h-64">
                        {chartData.length > 0 ? (
                            <NDVIChart data={chartData} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                No data available. Run analysis.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
