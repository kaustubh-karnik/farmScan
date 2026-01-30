
import { createClient } from "@/lib/supabase/server";
import FieldDashboard from "./field-dashboard";
import { notFound } from "next/navigation";

export default async function FieldDetailPage({ params }: { params: Promise<{ fieldId: string }> }) {
    const { fieldId } = await params;
    const supabase = await createClient();

    const { data: field } = await supabase
        .from("fields")
        .select("*")
        .eq("id", fieldId)
        .single();

    if (!field) return notFound();

    // Fetch alerts
    const { data: alerts } = await supabase
        .from("alerts")
        .select("*")
        .eq("field_id", fieldId)
        .is("resolved_at", null)
        .order("detected_at", { ascending: false });

    // Fetch readings (Time series)
    const { data: readings } = await supabase
        .from("vegetation_readings")
        .select("*")
        .eq("field_id", fieldId)
        .order("date", { ascending: true });

    // Group alerts by message and keep only the latest for each unique message
    const uniqueAlerts = alerts?.reduce((acc, alert) => {
        const existing = acc.find((a: any) => a.message === alert.message);
        if (!existing || new Date(alert.detected_at) > new Date(existing.detected_at)) {
            return [...acc.filter((a: any) => a.message !== alert.message), alert];
        }
        return acc;
    }, [] as typeof alerts) || [];

    // Convert Geometry to simple array for Map [lat, lng]
    // PostGIS returns GeoJSON geometry usually if using strict typing or just an object.
    // We need to parse coordinates.
    // coordinates are usually [[[lng, lat], ...]] for Polygon.
    // We need to flip to [lat, lng].
    let polygonCoords: [number, number][] = [];
    if (field.geometry && field.geometry.coordinates && field.geometry.coordinates[0]) {
        polygonCoords = field.geometry.coordinates[0].map((p: number[]) => [p[1], p[0]]);
    }

    return (
        <div className="container mx-auto p-4">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">{field.name}</h1>
                <p className="text-gray-600">Crop: {field.crop_type} | Planted: {field.planting_date}</p>
            </div>

            {uniqueAlerts && uniqueAlerts.length > 0 && (
                <div className="mb-6 space-y-2">
                    <h2 className="text-xl font-bold text-red-600">Active Alerts</h2>
                    {uniqueAlerts.map((alert: any) => (
                        <div key={alert.id} className={`p-4 rounded border-l-4 ${alert.severity === 'high' ? 'border-red-600 bg-red-50' : 'border-yellow-500 bg-yellow-50'}`}>
                            <div className="font-bold uppercase text-xs text-gray-500">{alert.severity} Priority</div>
                            <p className="font-medium">{alert.message}</p>
                            <p className="text-xs text-gray-500 font-semibold">{new Date(alert.detected_at).toLocaleDateString()}</p>
                        </div>
                    ))}
                </div>
            )}

            <FieldDashboard
                fieldId={field.id}
                polygon={polygonCoords}
                readings={readings || []}
            />
        </div>
    );
}
