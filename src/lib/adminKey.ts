import { ADMIN_MUTATION_HEADER } from '@/lib/adminGuard'

const STORAGE_KEY = 'ai2b-admin-mutation-key'

export function getAdminMutationKey(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

export function setAdminMutationKey(value: string | null) {
  if (typeof window === 'undefined') return
  if (!value) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, value)
}

export function buildAdminHeaders(extra?: HeadersInit) {
  const headers = new Headers(extra)
  const key = getAdminMutationKey()
  if (key) {
    headers.set(ADMIN_MUTATION_HEADER, key)
  }
  return headers
}

export function isAdminKeySet() {
  return Boolean(getAdminMutationKey())
}
