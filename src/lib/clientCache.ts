/**
 * Client-side singleton cache — persists across Next.js soft navigations.
 * Data is stored in module-level memory so it survives page transitions
 * without triggering a full reload or re-fetch.
 */

interface CacheEntry<T> {
    data: T;
    fetchedAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export async function cachedGet<T>(url: string, ttlMs = 15 * 60 * 1000): Promise<T> {
    const existing = store.get(url);
    if (existing && Date.now() - existing.fetchedAt < ttlMs) {
        return existing.data as T;
    }

    // Deduplicate concurrent fetches
    const pending = inflight.get(url);
    if (pending) return pending as Promise<T>;

    const promise = fetch(url)
        .then((r) => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json() as Promise<T>;
        })
        .then((data) => {
            store.set(url, { data, fetchedAt: Date.now() });
            inflight.delete(url);
            return data;
        })
        .catch((err) => {
            inflight.delete(url);
            throw err;
        });

    inflight.set(url, promise);
    return promise as Promise<T>;
}

export function bustCache(urlPrefix?: string) {
    if (!urlPrefix) {
        store.clear();
    } else {
        for (const key of store.keys()) {
            if (key.startsWith(urlPrefix)) store.delete(key);
        }
    }
}

export function primeCache<T>(url: string, data: T) {
    store.set(url, { data, fetchedAt: Date.now() });
}
