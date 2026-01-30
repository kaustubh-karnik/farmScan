"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AnalyzeButton({ fieldId }: { fieldId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleAnalyze = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/fields/${fieldId}/analyze`, { method: "POST" });
            if (!res.ok) throw new Error("Failed");
            router.push(`/fields/${fieldId}`);
            router.refresh();
        } catch (e) {
            alert("Analysis failed");
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handleAnalyze}
            disabled={loading}
            size="sm"
            className="flex-shrink-0"
        >
            {loading ? (
                <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} />
                    <span>Analyzing...</span>
                </>
            ) : (
                <>
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>Analyze</span>
                </>
            )}
        </Button>
    );
}
