import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

const TOKEN_KEY = 'webplanning_token';
const USER_KEY = 'webplanning_user';

export class ApiError extends Error {
    status: number;
    payload: unknown;
    /** Backend-foutcode, bv. 'alleen_lezen' | 'geblokkeerd' | 'org_inactief' | 'gebruikerslimiet' bij 402. */
    code?: string;
    constructor(message: string, status: number, payload: unknown) {
        super(message);
        this.status = status;
        this.payload = payload;
        if (payload && typeof payload === 'object' && typeof (payload as any).code === 'string') {
            this.code = (payload as any).code;
        }
    }
}

let paymentRequiredHandler: ((code: string | undefined) => void) | null = null;
/** Wordt aangeroepen bij een 402 (abonnement verlopen/geblokkeerd), zodat de app een banner kan tonen. */
export function onPaymentRequired(handler: (code: string | undefined) => void) {
    paymentRequiredHandler = handler;
}

let unauthorizedHandler: (() => void) | null = null;
export function onUnauthorized(handler: () => void) {
    unauthorizedHandler = handler;
}

function extractErrorMessage(payload: unknown, status: number): string {
    if (payload && typeof payload === 'object') {
        const obj = payload as Record<string, unknown>;
        if (typeof obj.message === 'string' && obj.message) return obj.message;
        if (typeof obj.error === 'string' && obj.error) return obj.error;
    }
    return `Serverfout (${status})`;
}

export async function getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setSession(token: string, user: unknown) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser<T = unknown>(): Promise<T | null> {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export async function clearSession() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
}

type RequestOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined | null>;
};

function buildUrl(path: string, query?: RequestOptions['query']) {
    const url = new URL(path.replace(/^\//, ''), API_URL.endsWith('/') ? API_URL : `${API_URL}/`);
    if (query) {
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
        });
    }
    return url.toString();
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(buildUrl(path, options.query), {
        method: options.method || 'GET',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    let payload: unknown = null;
    const text = await response.text();
    if (text) {
        try {
            payload = JSON.parse(text);
        } catch {
            payload = text;
        }
    }

    if (response.status === 401) {
        await clearSession();
        unauthorizedHandler?.();
    }

    if (!response.ok) {
        const message = extractErrorMessage(payload, response.status);
        const error = new ApiError(message, response.status, payload);
        if (response.status === 402 && error.code !== 'gebruikerslimiet') paymentRequiredHandler?.(error.code);
        throw error;
    }

    return payload as T;
}

export async function apiUpload<T = unknown>(path: string, formData: FormData, method: 'POST' | 'PUT' = 'POST'): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(buildUrl(path), {
        method,
        headers,
        body: formData,
    });

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
        try {
            payload = JSON.parse(text);
        } catch {
            payload = text;
        }
    }

    if (response.status === 401) {
        await clearSession();
        unauthorizedHandler?.();
    }

    if (!response.ok) {
        const message = extractErrorMessage(payload, response.status);
        const error = new ApiError(message, response.status, payload);
        if (response.status === 402 && error.code !== 'gebruikerslimiet') paymentRequiredHandler?.(error.code);
        throw error;
    }

    return payload as T;
}
