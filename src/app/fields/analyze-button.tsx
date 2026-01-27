"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AnalyzeButton({ fieldId }: { fieldId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleAnalyze = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/fields/${fieldId}/analyze`, { method: "POST" });
            if (!res.ok) throw new Error("Failed");
            router.refresh();
        } catch (e) {
            alert("Analysis failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-1.5 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
        >
            {loading ? (
                <>
                    <span className="w-3 h-3 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin"></span>
                    Analyzing...
                </>
            ) : (
                <>
                    <span>🔍</span>
                    Analyze Now
                </>
            )}
        </button>
    );
}
