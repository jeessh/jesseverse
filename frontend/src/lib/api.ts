import { supabase } from "./supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  // Skip auth header for public endpoints
  public?: boolean;
};

/**
 * API client for making authenticated requests to the backend.
 *
 * Usage:
 *   const data = await api.get("/api/notes");
 *   const note = await api.post("/api/notes", { title: "My note" });
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
      };
    }
    return {};
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {}, public: isPublic } = options;

    const authHeaders = isPublic ? {} : await this.getAuthHeaders();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        error.detail || `Request failed: ${response.statusText}`
      );
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  // Convenience methods
  async get<T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method">) {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }

  async put<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method">) {
    return this.request<T>(endpoint, { ...options, method: "PUT", body });
  }

  async patch<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method">) {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body });
  }

  async delete<T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

/**
 * Custom error class for API errors.
 */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);

// Export class for custom instances
export { ApiClient };
