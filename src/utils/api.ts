const BASE_URL = import.meta.env.VITE_BACKEND_URL as string;

function getToken(): string | null {
  return localStorage.getItem('unchanged_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const errBody = await res.json();
      // The backend may wrap error details in { message } or { data: { message } }
      message = errBody?.message ?? errBody?.data?.message ?? message;
    } catch (_) {}
    throw new Error(message);
  }

  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as unknown as T;

  const json = await res.json();

  // The backend's TransformInterceptor wraps every success response as:
  //   { success: true, data: <payload>, timestamp: "..." }
  // Unwrap it transparently so callers always receive the real payload.
  if (json && typeof json === 'object' && json.success === true && 'data' in json) {
    return json.data as T;
  }

  return json as T;
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

export interface OrderResponse {
  id: string;
  orderNumber: string;
  totalAmount: number;
  [key: string]: unknown;
}

export async function createOrder(payload: {
  addressId: string;
  paymentMethod?: string;
  items?: { variantId: string; quantity: number }[];
}): Promise<OrderResponse> {
  return request<OrderResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
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
