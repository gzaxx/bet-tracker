import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { portfolioApi, profileApi } from '../../services/api'
import type { CreatePortfolioRequest, CreateProfileRequest, Portfolio, Profile, UpdatePortfolioRequest, UpdateProfileRequest } from '../../types/domain'

const activeProfileStorageKey = 'bet-tracker.active-profile-id'

type ProfileContextValue = {
  profiles: Profile[]
  portfolios: Portfolio[]
  activeProfile: Profile | undefined
  activeProfileId: number | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  selectProfile: (id: number) => void
  createProfileAndPortfolio: (profile: CreateProfileRequest, portfolioName: string) => Promise<boolean>
  createProfile: (request: CreateProfileRequest) => Promise<boolean>
  updateProfile: (id: number, request: UpdateProfileRequest) => Promise<boolean>
  deleteProfile: (id: number) => Promise<boolean>
  createPortfolio: (request: CreatePortfolioRequest) => Promise<boolean>
  updatePortfolio: (id: number, request: UpdatePortfolioRequest) => Promise<boolean>
  deletePortfolio: (id: number) => Promise<boolean>
  clearError: () => void
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined)

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  return 'The request could not be completed.'
}

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [nextProfiles, nextPortfolios] = await Promise.all([profileApi.list(), portfolioApi.list()])
      setProfiles(nextProfiles)
      setPortfolios(nextPortfolios)
      const storedId = Number(window.localStorage.getItem(activeProfileStorageKey))
      const selectedId = nextProfiles.some((profile) => profile.id === storedId) ? storedId : nextProfiles[0]?.id ?? null
      setActiveProfileId(selectedId)
      if (selectedId === null) {
        window.localStorage.removeItem(activeProfileStorageKey)
      } else {
        window.localStorage.setItem(activeProfileStorageKey, String(selectedId))
      }
    } catch (caught: unknown) {
      setError(getErrorMessage(caught))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const selectProfile = useCallback((id: number) => {
    setActiveProfileId(id)
    window.localStorage.setItem(activeProfileStorageKey, String(id))
    setError(null)
  }, [])

  const createProfileAndPortfolio = useCallback(async (profileRequest: CreateProfileRequest, portfolioName: string) => {
    setError(null)
    try {
      const profile = await profileApi.create(profileRequest)
      setProfiles((current) => [...current, profile].sort((left, right) => left.name.localeCompare(right.name)))
      selectProfile(profile.id)
      const portfolio = await portfolioApi.create({ profileId: profile.id, name: portfolioName })
      setPortfolios((current) => [...current, portfolio])
      return true
    } catch (caught: unknown) {
      setError(getErrorMessage(caught))
      return false
    }
  }, [selectProfile])

  const createProfile = useCallback(async (request: CreateProfileRequest) => {
    setError(null)
    try {
      const profile = await profileApi.create(request)
      setProfiles((current) => [...current, profile].sort((left, right) => left.name.localeCompare(right.name)))
      selectProfile(profile.id)
      return true
    } catch (caught: unknown) {
      setError(getErrorMessage(caught))
      return false
    }
  }, [selectProfile])

  const updateProfile = useCallback(async (id: number, request: UpdateProfileRequest) => {
    setError(null)
    try {
      const profile = await profileApi.update(id, request)
      setProfiles((current) => current.map((candidate) => candidate.id === id ? profile : candidate).sort((left, right) => left.name.localeCompare(right.name)))
      return true
    } catch (caught: unknown) {
      setError(getErrorMessage(caught))
      return false
    }
  }, [])

  const deleteProfile = useCallback(async (id: number) => {
    setError(null)
    try {
      await profileApi.remove(id)
      const remainingProfiles = profiles.filter((profile) => profile.id !== id)
      setProfiles(remainingProfiles)
      setPortfolios((current) => current.filter((portfolio) => portfolio.profileId !== id))
      if (activeProfileId === id) {
        const nextId = remainingProfiles[0]?.id ?? null
        setActiveProfileId(nextId)
        if (nextId === null) {
          window.localStorage.removeItem(activeProfileStorageKey)
        } else {
          window.localStorage.setItem(activeProfileStorageKey, String(nextId))
        }
      }
      return true
    } catch (caught: unknown) {
      setError(getErrorMessage(caught))
      return false
    }
  }, [activeProfileId, profiles])

  const createPortfolio = useCallback(async (request: CreatePortfolioRequest) => {
    setError(null)
    try {
      const portfolio = await portfolioApi.create(request)
      setPortfolios((current) => [...current, portfolio])
      return true
    } catch (caught: unknown) {
      setError(getErrorMessage(caught))
      return false
    }
  }, [])

  const updatePortfolio = useCallback(async (id: number, request: UpdatePortfolioRequest) => {
    setError(null)
    try {
      const portfolio = await portfolioApi.update(id, request)
      setPortfolios((current) => current.map((candidate) => candidate.id === id ? portfolio : candidate))
      return true
    } catch (caught: unknown) {
      setError(getErrorMessage(caught))
      return false
    }
  }, [])

  const deletePortfolio = useCallback(async (id: number) => {
    setError(null)
    try {
      await portfolioApi.remove(id)
      setPortfolios((current) => current.filter((portfolio) => portfolio.id !== id))
      return true
    } catch (caught: unknown) {
      setError(getErrorMessage(caught))
      return false
    }
  }, [])

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId)
  const value = useMemo<ProfileContextValue>(() => ({
    profiles,
    portfolios,
    activeProfile,
    activeProfileId,
    loading,
    error,
    refresh,
    selectProfile,
    createProfileAndPortfolio,
    createProfile,
    updateProfile,
    deleteProfile,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
    clearError,
  }), [activeProfile, activeProfileId, clearError, createPortfolio, createProfile, createProfileAndPortfolio, deletePortfolio, deleteProfile, error, loading, portfolios, profiles, refresh, selectProfile, updatePortfolio, updateProfile])

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export const useProfiles = (): ProfileContextValue => {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfiles must be used inside ProfileProvider.')
  }

  return context
}


