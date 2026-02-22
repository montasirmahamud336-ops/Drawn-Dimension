import { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/components/admin/adminAuth";

const sortByDisplayOrder = (items: any[]) => {
    return [...items].sort((a, b) => {
        const aOrder = Number(a?.display_order);
        const bOrder = Number(b?.display_order);

        const aHasOrder = Number.isFinite(aOrder);
        const bHasOrder = Number.isFinite(bOrder);

        if (aHasOrder && bHasOrder) {
            if (aOrder !== bOrder) return aOrder - bOrder;
        } else if (aHasOrder) {
            return -1;
        } else if (bHasOrder) {
            return 1;
        }

        const aCreated = new Date(a?.created_at ?? 0).getTime();
        const bCreated = new Date(b?.created_at ?? 0).getTime();
        return bCreated - aCreated;
    });
};

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
                    setData(Array.isArray(json) ? sortByDisplayOrder(json) : []);
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
