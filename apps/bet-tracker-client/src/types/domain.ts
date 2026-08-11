export interface Profile {
  id: number
  name: string
  defaultCurrency: string
  createdAt: string
  updatedAt: string
}

export interface Portfolio {
  id: number
  profileId: number
  name: string
  currency: string
  createdAt: string
  updatedAt: string
}

export interface CreateProfileRequest {
  name: string
  defaultCurrency: string
}

export interface UpdateProfileRequest {
  name: string
  defaultCurrency: string
}

export interface CreatePortfolioRequest {
  profileId: number
  name: string
}

export interface UpdatePortfolioRequest {
  name: string
}
