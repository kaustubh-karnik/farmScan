import { createClient } from "@/lib/supabase/server";
import { getNDVITimeSeries } from "@/lib/sentinel/statistics";
import { detectNDVIAnomalies } from "@/lib/anomaly";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ fieldId: string }> }
) {
    const { fieldId } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Fetch Field
        const { data: field } = await supabase.from("fields").select("geometry, planting_date").eq("id", fieldId).single();
        if (!field) return NextResponse.json({ error: "Field not found" }, { status: 404 });

        // 2. Fetch Time Series
        const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const to = new Date().toISOString();

        const timeSeries = await getNDVITimeSeries({
            geometry: field.geometry,
            from,
            to,
            intervalDays: 3
        });

        // 3. Save Readings
        if (timeSeries.length > 0) {
            const readings = timeSeries.map(pt => ({
                field_id: fieldId,
                date: pt.date.split("T")[0],
                ndvi_mean: pt.mean,
                ndvi_std: pt.stdDev,
                valid_pixel_ratio: pt.validRatio
            }));

            const { error: upsertError } = await supabase
                .from("vegetation_readings")
                .upsert(readings, { onConflict: "field_id, date" });

            if (upsertError) {
                console.error("Upsert Error:", upsertError);
                // If upsert fails due to missing constraint, try insert
                // (Note: This might cause duplicates if unique constraint is missing)
                await supabase.from("vegetation_readings").insert(readings);
            }
        }

        // 4. Detect Anomalies
        const newAlerts = detectNDVIAnomalies(timeSeries);

        // 5. Save Alerts
        if (newAlerts.length > 0) {
            const alertRows = newAlerts.map(a => ({
                field_id: fieldId,
                type: a.type,
                severity: a.severity,
                message: a.message,
                detected_at: new Date().toISOString()
            }));
            await supabase.from("alerts").insert(alertRows);
        }

        // 6. Revalidate pages
        revalidatePath(`/fields/${fieldId}`);
        revalidatePath("/fields");

        return NextResponse.json({
            success: true,
            data: {
                readingsCount: timeSeries.length,
                alertsCount: newAlerts.length,
                latestNDVI: timeSeries.length > 0 ? timeSeries[timeSeries.length - 1].mean : null
            }
        });

    } catch (err: any) {
        console.error("Analysis Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
