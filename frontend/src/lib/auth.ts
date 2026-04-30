import { api } from "./axios"

const TOKEN_KEY = "bluemoon_token"
const USER_KEY = "bluemoon_user"

export type UserRole = "admin" | "accountant" | "resident"

interface StoredUser {
  id: string
  username: string
  role: UserRole
  full_name?: string
  resident_id?: string
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function setStoredUser(user: StoredUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export async function login(username: string, password: string): Promise<StoredUser> {
  const res = await api.post<{
    access_token: string
    token_type: string
    role: UserRole
    username: string
    full_name?: string
    resident_id?: string
  }>("/auth/login", { username, password })

  setToken(res.data.access_token)
  const user: StoredUser = {
    id: "", // not returned by login
    username: res.data.username,
    role: res.data.role,
    full_name: res.data.full_name,
    resident_id: res.data.resident_id,
  }
  setStoredUser(user)
  return user
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function isAdmin(): boolean {
  const user = getStoredUser()
  return user?.role === "admin"
}

export function isResident(): boolean {
  const user = getStoredUser()
  return user?.role === "resident"
}
