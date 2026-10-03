import { useCallback, useEffect, useState } from 'react';
import * as api from '../services/api';

/** Loads content_pieces for a client (optionally one month), keeping the previous list visible while refetching. */
export function useContentPieces(clientId: string | null | undefined, month?: string) {
    const [pieces, setPieces] = useState<api.ContentPiece[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!clientId) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        api.getContentPieces(clientId, month)
            .then((data) => { if (!cancelled) { setPieces(data); setError(null); } })
            .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'No se pudieron cargar las piezas'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [clientId, month]);

    const replacePiece = useCallback((updated: api.ContentPiece) => {
        setPieces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    }, []);

    return { pieces, loading, error, replacePiece };
}
