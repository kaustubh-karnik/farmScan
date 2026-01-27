import { SENTINEL_CONFIG } from "@/config/sentinel";
import { getSentinelToken } from "./auth";

export async function getIndexRaster(args: {
    geometry: GeoJSON.Polygon;
    date: string; // ISO date or simple YYYY-MM-DD
    evalscript: string;
    width?: number; // Optional, defaults to auto or fixed
    height?: number;
}): Promise<ArrayBuffer> {
    const token = await getSentinelToken();

    // Format date interval for single day or specific range
    // Process API expects time range as object with from/to ISO strings
    const fromDate = new Date(args.date);
    fromDate.setUTCHours(0, 0, 0, 0);
    const toDate = new Date(args.date);
    toDate.setUTCHours(23, 59, 59, 0);

    // Calculate BBox for Aspect Ratio
    const coords = args.geometry.coordinates[0];
    let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
    for (const p of coords) {
        const lng = p[0];
        const lat = p[1];
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    }

    const centerLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
    // Aspect = Width / Height
    const aspect = (Math.abs(maxLng - minLng) * Math.cos(centerLatRad)) / (Math.abs(maxLat - minLat) || 0.00001);

    const width = args.width ?? 1024;
    const height = args.height ?? Math.max(64, Math.round(width / aspect));

    const body = {
        input: {
            bounds: {
                geometry: args.geometry,
                properties: {
                    crs: "http://www.opengis.net/def/crs/EPSG/0/4326"
                }
            },
            data: [{
                type: "sentinel-2-l2a",
                dataFilter: {
                    timeRange: {
                        from: fromDate.toISOString().split('.')[0] + 'Z',
                        to: toDate.toISOString().split('.')[0] + 'Z'
                    }
                },
                processing: {
                    upsampling: "BICUBIC",
                    downsampling: "BICUBIC"
                }
            }]
        },
        output: {
            width: width,
            height: height,
            responses: [
                {
                    identifier: "default",
                    format: {
                        type: "image/png"
                    }
                }
            ]
        },
        evalscript: args.evalscript
    };

    const response = await fetch(SENTINEL_CONFIG.PROCESS_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "image/png"
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Process API Error: ${response.status} ${await response.text()}`);
    }

    return await response.arrayBuffer();
}
