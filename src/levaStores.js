import { createContext, useContext } from 'react'

export const LevaStoresContext = createContext(null)

export function useLevaStores() {
  const stores = useContext(LevaStoresContext)
  if (!stores) throw new Error('useLevaStores must be used within LevaStoresContext')
  return stores
}
