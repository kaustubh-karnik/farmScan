
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Wheat, Tractor, Plus, TrendingUp, Activity, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200/60 sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-5 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">My Fields</h1>
                            <p className="text-xs text-slate-600 font-medium mt-0.5">माझे शेत</p>
                        </div>
                        <Link href="/fields/new">
                            <Button size="default">
                                <Plus className="w-4 h-4" strokeWidth={2.5} />
                                <span>Add Field</span>
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-5 py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {fields?.map((field) => {
                        // Get latest reading
                        const latestReading = field.vegetation_readings?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())?.[0];
                        const ndvi = latestReading?.ndvi_mean;
                        const healthVariant = ndvi >= 0.7 ? 'success' : ndvi >= 0.4 ? 'warning' : 'destructive';

                        return (
                            <Card key={field.id} className="border border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 overflow-hidden group">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                                <Wheat className="w-5 h-5 text-white" strokeWidth={2.5} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <CardTitle className="truncate">{field.name}</CardTitle>
                                                <CardDescription className="uppercase tracking-wider font-semibold mt-0.5">
                                                    {field.crop_type}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge variant={healthVariant} className="flex-shrink-0">
                                            {ndvi ? ndvi.toFixed(2) : "N/A"}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-0 space-y-2.5">
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                                        <Activity className="w-3 h-3" strokeWidth={2.5} />
                                        <span className="font-medium">
                                            {latestReading ? 
                                                `Last scanned ${new Date(latestReading.date).toLocaleDateString()}` 
                                                : 'No data yet'}
                                        </span>
                                    </div>

                                    <div className="flex gap-2">
                                        <Link href={`/fields/${field.id}`} className="flex-1">
                                            <Button variant="outline" size="sm" className="w-full">
                                                <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                                                <span>Details</span>
                                            </Button>
                                        </Link>
                                        <AnalyzeButton fieldId={field.id} />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {fields?.length === 0 && (
                    <Card className="col-span-full border-2 border-dashed border-slate-300 bg-white">
                        <CardContent className="text-center py-12">
                            <div className="flex justify-center mb-5">
                                <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                                    <Tractor className="w-8 h-8 text-slate-400" strokeWidth={2.5} />
                                </div>
                            </div>
                            <h3 className="text-base font-semibold text-slate-900 mb-1">No fields yet</h3>
                            <p className="text-slate-600 mb-5 text-sm">Add your first field to start monitoring</p>
                            <Link href="/fields/new">
                                <Button size="default">
                                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                                    <span>Add First Field</span>
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
