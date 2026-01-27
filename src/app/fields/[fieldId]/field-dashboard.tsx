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

    // Set initial selected date to latest reading
    useEffect(() => {
        if (readings.length > 0) {
            const latest = readings[readings.length - 1];
            setSelectedDate(latest.date);
        }
    }, [readings]);

    // Fetch map when date changes
    useEffect(() => {
        if (!selectedDate) return;

        async function fetchMap() {
            setMapLoading(true);
            try {
                const res = await fetch(`/api/fields/${fieldId}/map?date=${selectedDate}&index=ndvi`);
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
    }, [fieldId, selectedDate]);

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
