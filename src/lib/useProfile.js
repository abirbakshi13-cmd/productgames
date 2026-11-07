import { useSyncExternalStore } from 'react'
import { getProfile, saveProfile, subscribe } from './profileStore.js'

// Returns [profile, saveProfile]; re-renders on every profile change.
// getProfile() returns a cached reference, so the snapshot is stable between changes.
export function useProfile() {
  const profile = useSyncExternalStore(subscribe, getProfile, getProfile)
  return [profile, saveProfile]
}
