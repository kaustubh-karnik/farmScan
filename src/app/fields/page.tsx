
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

import AnalyzeButton from "./analyze-button"; // Client component for the action

export default async function FieldsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return <div className="p-4">Please log in to view fields.</div>;
    }

    const { data: fields } = await supabase
        .from("fields")
        .select("*, vegetation_readings(ndvi_mean, date)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-4 shadow-lg mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold text-white">My Fields</h1>
                    <Link href="/fields/new" className="bg-white text-emerald-700 px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-emerald-50 transition-colors">
                        + Add Field
                    </Link>
                </div>
                <p className="text-emerald-100 text-sm">माझे शेत</p>
            </div>

            <div className="max-w-4xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fields?.map((field) => {
                        // Get latest reading
                        const latestReading = field.vegetation_readings?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())?.[0];
                        const ndvi = latestReading?.ndvi_mean;
                        const healthColor = ndvi >= 0.7 ? 'text-green-600' : ndvi >= 0.4 ? 'text-yellow-600' : 'text-red-500';

                        return (
                            <div key={field.id} className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl">
                                            🌾
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">{field.name}</h2>
                                            <p className="text-gray-500 text-sm font-medium uppercase tracking-tight">{field.crop_type}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold text-gray-400 uppercase">NDVI Status</div>
                                        <div className={`text-2xl font-black ${ndvi ? healthColor : 'text-gray-300'}`}>
                                            {ndvi ? ndvi.toFixed(2) : "N/A"}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                                    <Link 
                                        href={`/fields/${field.id}`} 
                                        className="text-emerald-600 font-bold text-sm hover:underline flex items-center gap-1"
                                    >
                                        View Details →
                                    </Link>
                                    <AnalyzeButton fieldId={field.id} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {fields?.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-inner border-2 border-dashed border-gray-200">
                        <div className="text-4xl mb-4">🚜</div>
                        <h3 className="text-lg font-bold text-gray-900">No fields found</h3>
                        <p className="text-gray-500 mb-6 font-medium">Create your first field to start monitoring</p>
                        <Link href="/fields/new" className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all">
                            Add First Field
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
