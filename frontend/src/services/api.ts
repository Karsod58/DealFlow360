import type {
  LoginRequest,
  SignupRequest,
  AuthResponse,
  Quotation,
  DashboardStats,
  ActivityItem,
  Product,
  LineItem,
} from '../types';

const API_BASE_URL = '/api';

// Mock authentication token storage
export const authService = {
  getToken: (): string | null => localStorage.getItem('token'),
  
  setToken: (token: string): void => localStorage.setItem('token', token),
  
  removeToken: (): void => localStorage.removeItem('token'),
  
  isAuthenticated: (): boolean => !!localStorage.getItem('token'),
  
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// API request helper with auth header
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = authService.getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(error.detail || 'Request failed');
  }

  return response.json();
}

// Auth API
export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Quotations API
export const quotationsApi = {
  getAll: async (status?: string): Promise<Quotation[]> => {
    const url = status ? `/quotations?status=${status}` : '/quotations';
    return apiRequest<Quotation[]>(url);
  },

  getById: async (id: string): Promise<Quotation> => {
    return apiRequest<Quotation>(`/quotations/${id}`);
  },

  create: async (): Promise<Quotation> => {
    // Get first available customer ID from database
    try {
      // Try to get customers list to find a valid ID
      const quotations = await apiRequest<Quotation[]>('/quotations');
      const validCustomerId = quotations.length > 0 && quotations[0].customer_id 
        ? quotations[0].customer_id 
        : 181; // Fallback to typical first customer ID from seed
      
      return apiRequest<Quotation>('/quotations', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: validCustomerId,
          price_list_id: 'default',
        }),
      });
    } catch (error) {
      // If fetching fails, try with a default customer ID
      return apiRequest<Quotation>('/quotations', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: 181, // Default from seed data
          price_list_id: 'default',
        }),
      });
    }
  },

  update: async (id: string, data: Partial<Quotation>): Promise<Quotation> => {
    return apiRequest<Quotation>(`/quotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  submitForApproval: async (id: string): Promise<Quotation> => {
    return apiRequest<Quotation>(`/quotations/${id}/submit`, {
      method: 'POST',
    });
  },

  addLineItem: async (quotationId: string, lineItem: any): Promise<LineItem> => {
    return apiRequest<LineItem>(`/quotations/${quotationId}/line-items`, {
      method: 'POST',
      body: JSON.stringify(lineItem),
    });
  },

  updateLineItem: async (quotationId: string, lineItemId: string, data: any): Promise<LineItem> => {
    return apiRequest<LineItem>(`/quotations/${quotationId}/line-items/${lineItemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteLineItem: async (quotationId: string, lineItemId: string): Promise<void> => {
    return apiRequest<void>(`/quotations/${quotationId}/line-items/${lineItemId}`, {
      method: 'DELETE',
    });
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    return apiRequest<DashboardStats>('/dashboard/stats');
  },

  getRecentActivity: async (): Promise<ActivityItem[]> => {
    return apiRequest<ActivityItem[]>('/dashboard/activity');
  },
};

// Products API
export const productsApi = {
  getUpsellSuggestions: async (quotationId: string): Promise<Product[]> => {
    return apiRequest<Product[]>(`/products/suggestions/${quotationId}`);
  },
};



// Fulfillment API
export const fulfillmentApi = {
  getStock: async () => {
    return apiRequest('/fulfillment/stock');
  },

  getOrdersAwaiting: async () => {
    return apiRequest('/fulfillment/orders');
  },

  calculateSplit: async (quotationId: number) => {
    return apiRequest(`/fulfillment/${quotationId}/calculate-split`);
  },

  acceptSplit: async (quotationId: number) => {
    return apiRequest(`/fulfillment/${quotationId}/accept-split`, {
      method: 'POST',
    });
  },

  getSplits: async (quotationId: number) => {
    return apiRequest(`/fulfillment/${quotationId}/splits`);
  },
};

// Approvals API
export const approvalsApi = {
  getAll: async (statusFilter?: string) => {
    const url = statusFilter ? `/approvals?status=${statusFilter}` : '/approvals';
    return apiRequest(url);
  },

  getDetail: async (quotationId: number) => {
    return apiRequest(`/approvals/${quotationId}`);
  },

  approve: async (quotationId: number, note?: string) => {
    return apiRequest(`/approvals/${quotationId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ action: 'approve', note }),
    });
  },

  reject: async (quotationId: number, note?: string) => {
    return apiRequest(`/approvals/${quotationId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', note }),
    });
  },

  returnForRevision: async (quotationId: number, note?: string) => {
    return apiRequest(`/approvals/${quotationId}/return`, {
      method: 'POST',
      body: JSON.stringify({ action: 'return', note }),
    });
  },
};
