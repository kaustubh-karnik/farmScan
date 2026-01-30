"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LogoutButton() {
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <Button 
            variant="outline" 
            size="sm"
            onClick={handleLogout}
            className="gap-2"
        >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
        </Button>
    );
}
