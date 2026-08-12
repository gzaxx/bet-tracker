import type {
  CreatePortfolioRequest,
  CreateProfileRequest,
  CreateTradeRequest,
  Portfolio,
  Profile,
  Trade,
  UpdatePortfolioRequest,
  UpdateProfileRequest,
  UpdateTradeRequest,
} from '../types/domain'

export class ApiError extends Error {
  readonly status: number
  readonly details: Record<string, string[]> | undefined

  constructor(message: string, status: number, details?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    ...init,
  })

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => undefined)
    const problem = isProblemDetails(payload) ? payload : undefined
    throw new ApiError(problem?.detail ?? problem?.title ?? `Request failed with status ${response.status}.`, response.status, problem?.errors)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

const isProblemDetails = (value: unknown): value is {
  title?: string
  detail?: string
  errors?: Record<string, string[]>
} => typeof value === 'object' && value !== null

export const profileApi = {
  list: () => request<Profile[]>('/api/v1/profiles'),
  create: (body: CreateProfileRequest) => request<Profile>('/api/v1/profiles', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: UpdateProfileRequest) => request<Profile>(`/api/v1/profiles/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`/api/v1/profiles/${id}`, { method: 'DELETE' }),
}

export const portfolioApi = {
  list: () => request<Portfolio[]>('/api/v1/portfolios'),
  create: (body: CreatePortfolioRequest) => request<Portfolio>('/api/v1/portfolios', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: UpdatePortfolioRequest) => request<Portfolio>(`/api/v1/portfolios/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => request<void>(`/api/v1/portfolios/${id}`, { method: 'DELETE' }),
}

export const tradeApi = {
  list: (portfolioId: number) => request<Trade[]>(`/api/v1/portfolios/${portfolioId}/trades`),
  create: (portfolioId: number, body: CreateTradeRequest) => request<Trade>(`/api/v1/portfolios/${portfolioId}/trades`, { method: 'POST', body: JSON.stringify(body) }),
  update: (portfolioId: number, id: number, body: UpdateTradeRequest) => request<Trade>(`/api/v1/portfolios/${portfolioId}/trades/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (portfolioId: number, id: number) => request<void>(`/api/v1/portfolios/${portfolioId}/trades/${id}`, { method: 'DELETE' }),
}
