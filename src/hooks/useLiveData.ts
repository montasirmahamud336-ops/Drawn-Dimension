import { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/components/admin/adminAuth";

// Hook to fetch live data
export const useLiveData = (endpoint: string) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const apiBase = getApiBaseUrl();
                const res = await window.fetch(`${apiBase}/${endpoint}?status=live`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [endpoint]);

    return { data, loading };
};
