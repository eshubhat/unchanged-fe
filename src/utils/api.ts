const BASE_URL = import.meta.env.VITE_BACKEND_URL as string;

function getToken(): string | null {
  return localStorage.getItem('unchanged_token');
}

function clearAuthState(): void {
  localStorage.removeItem('unchanged_token');
  localStorage.removeItem('unchanged_user');
  localStorage.removeItem('unchanged_has_address');
}

// ─── Token Refresh ─────────────────────────────────────────────────────────

// Shared promise so concurrent 401s only trigger ONE refresh call.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',   // send the httpOnly refresh_token cookie
      });

      if (!res.ok) {
        clearAuthState();
        return null;
      }

      const json = await res.json();
      // Unwrap the TransformInterceptor envelope if present
      const data = json?.success === true ? json.data : json;
      const newToken: string | null = data?.accessToken ?? null;

      if (newToken) {
        localStorage.setItem('unchanged_token', newToken);

        // Re-hydrate user info so Navbar and other components stay in sync
        try {
          const meRes = await fetch(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${newToken}` },
            credentials: 'include',
          });
          if (meRes.ok) {
            const meJson = await meRes.json();
            const meData = meJson?.success === true ? meJson.data : meJson;
            const user = meData?.user ?? meData;
            if (user?.id) {
              localStorage.setItem('unchanged_user', JSON.stringify(user));
              window.dispatchEvent(new Event('authStateChanged'));
            }
          }
        } catch (_) { /* non-critical — token is refreshed even if /me fails */ }
      } else {
        clearAuthState();
      }

      return newToken;
    } catch {
      clearAuthState();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// ─── Core Request ──────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
  _isRetry = false,   // internal: prevents infinite refresh loops
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',   // always send cookies (needed for refresh_token cookie)
  });

  // ── Silent refresh on 401 ─────────────────────────────────────────────────
  if (res.status === 401 && authenticated && !_isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry the original request with the fresh token
      return request<T>(path, options, authenticated, true);
    }
    // Refresh failed — session is dead
    throw new Error('Your session has expired. Please log in again.');
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const errBody = await res.json();
      message = errBody?.message ?? errBody?.data?.message ?? message;
    } catch (_) {}
    throw new Error(message);
  }

  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as unknown as T;

  const json = await res.json();

  // Unwrap the backend's TransformInterceptor envelope:
  //   { success: true, data: <payload>, timestamp: "..." }
  if (json && typeof json === 'object' && json.success === true && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}


// ─── App-level auth init ────────────────────────────────────────────────────
// Call once on App mount. Silently restores the session so a hard refresh
// doesn't blow away the logged-in state even when the access token is stale.

export async function initAuth(): Promise<void> {
  const token = getToken();

  // If we have a token, verify it's still valid against /auth/me
  if (token) {
    try {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const json = await res.json();
        const data = json?.success === true ? json.data : json;
        const user = data?.user ?? data;
        if (user?.id) {
          localStorage.setItem('unchanged_user', JSON.stringify(user));
          window.dispatchEvent(new Event('authStateChanged'));
        }
        return; // Token is healthy — done
      }
    } catch (_) { /* network error — fall through to refresh */ }
  }

  // Token missing or /auth/me returned non-OK — try a silent refresh
  // refreshAccessToken already re-hydrates the user and dispatches authStateChanged
  await refreshAccessToken();
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  avatarUrl?: string | null;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  user?: UserInfo;
  hasAddress?: boolean;
}

export interface RegisterAddressPayload {
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export async function registerUser(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  address?: RegisterAddressPayload;
}): Promise<AuthTokens> {
  return request<AuthTokens>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, false);
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthTokens> {
  return request<AuthTokens>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, false);
}

export async function getMe(): Promise<{ user: UserInfo }> {
  return request<{ user: UserInfo }>('/auth/me');
}

// Google OAuth — just a redirect, not a fetch
export function initiateGoogleLogin() {
  // Strip /v1 from the API base to get the server root, then add the OAuth path
  const serverBase = BASE_URL.replace(/\/api\/v1$/, '');
  window.location.href = `${serverBase}/api/v1/auth/google`;
}

// ─── Address ───────────────────────────────────────────────────────────────

export interface SavedAddress {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

export interface AddressPayload {
  label?: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  isDefault?: boolean;
}

export async function getAddresses(): Promise<{ addresses: SavedAddress[] }> {
  return request<{ addresses: SavedAddress[] }>('/address');
}

export async function createAddress(payload: AddressPayload): Promise<{ address: SavedAddress }> {
  return request<{ address: SavedAddress }>('/address', {
    method: 'POST',
    body: JSON.stringify({ country: 'India', ...payload }),
  });
}

export async function updateAddress(
  id: string,
  payload: Partial<AddressPayload>,
): Promise<{ address: SavedAddress }> {
  return request<{ address: SavedAddress }>(`/address/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function setDefaultAddress(id: string): Promise<{ address: SavedAddress }> {
  return request<{ address: SavedAddress }>(`/address/${id}/default`, {
    method: 'PATCH',
  });
}

export async function deleteAddress(id: string): Promise<void> {
  return request<void>(`/address/${id}`, { method: 'DELETE' });
}

// ─── Orders ────────────────────────────────────────────────────────────────

export interface ProductSnapshot {
  productId: string | null;
  productName: string | null;
  sku: string | null;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  primaryImageUrl: string | null;
  brandName: string | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string | null;
  productSnapshot: ProductSnapshot;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountAmount: number;
}

export interface OrderStatusHistory {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  method: string | null;
  status: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: string;
  paymentStatus: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    landmark?: string | null;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  billingAddress: Record<string, unknown> | null;
  subtotal: number;
  shippingCharge: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  couponCode: string | null;
  notes: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  estimatedDelivery: string | null;
  deliveredAt: string | null;
  items: OrderItem[];
  statusHistory: OrderStatusHistory[];
  payment: Payment | null;
  createdAt: string;
  updatedAt: string;
}

// Kept for backward compatibility (used by createOrder return type)
export interface OrderResponse extends Order {}

export interface PaginatedOrders {
  data: Order[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export async function createOrder(payload: {
  addressId: string;
  paymentMethod?: string;
  items?: { variantId: string; quantity: number }[];
}): Promise<Order> {
  return request<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMyOrders(params?: {
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
}): Promise<PaginatedOrders> {
  const query = new URLSearchParams();
  if (params?.page)   query.set('page',   String(params.page));
  if (params?.limit)  query.set('limit',  String(params.limit));
  if (params?.status) query.set('status', params.status);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  const qs = query.toString();
  return request<PaginatedOrders>(`/orders${qs ? `?${qs}` : ''}`);
}

export async function getMyOrder(id: string): Promise<Order> {
  return request<Order>(`/orders/${id}`);
}

export async function cancelOrder(id: string, reason: string): Promise<Order> {
  return request<Order>(`/orders/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ─── Payments ──────────────────────────────────────────────────────────────

export interface InitiatePaymentResponse {
  razorpayOrderId: string;
  amount: number;      // in paise
  currency: string;
  key: string;
}

export async function initiatePayment(orderId: string): Promise<InitiatePaymentResponse> {
  return request<InitiatePaymentResponse>('/payments/initiate', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
}

export interface VerifyPaymentPayload {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export async function verifyPayment(payload: VerifyPaymentPayload): Promise<unknown> {
  return request<unknown>('/payments/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
