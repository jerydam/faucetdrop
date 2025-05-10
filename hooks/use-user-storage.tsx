"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/hooks/use-wallet"

type UserData = {
  displayName?: string
  email?: string
  preferences?: {
    notifications: boolean
    theme: "light" | "dark" | "system"
  }
  recentActivity?: {
    type: string
    faucetAddress: string
    timestamp: number
    details?: any
  }[]
}

export function useUserStorage() {
  const { address } = useWallet()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user data from localStorage
  useEffect(() => {
    if (!address) {
      setUserData(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const storedData = localStorage.getItem(`user_${address.toLowerCase()}`)
      if (storedData) {
        setUserData(JSON.parse(storedData))
      } else {
        // Initialize with default values
        const defaultData: UserData = {
          preferences: {
            notifications: true,
            theme: "system",
          },
          recentActivity: [],
        }
        setUserData(defaultData)
        localStorage.setItem(`user_${address.toLowerCase()}`, JSON.stringify(defaultData))
      }
    } catch (error) {
      console.error("Error loading user data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [address])

  // Update user data
  const updateUserData = (newData: Partial<UserData>) => {
    if (!address) return

    try {
      const updatedData = { ...userData, ...newData }
      setUserData(updatedData)
      localStorage.setItem(`user_${address.toLowerCase()}`, JSON.stringify(updatedData))
    } catch (error) {
      console.error("Error updating user data:", error)
    }
  }

  // Add activity to user history
  const addActivity = (activity: {
    type: string
    faucetAddress: string
    details?: any
  }) => {
    if (!address || !userData) return

    try {
      const newActivity = {
        ...activity,
        timestamp: Date.now(),
      }

      const updatedActivities = [
        newActivity,
        ...(userData.recentActivity || []).slice(0, 19), // Keep only the 20 most recent activities
      ]

      const updatedData = {
        ...userData,
        recentActivity: updatedActivities,
      }

      setUserData(updatedData)
      localStorage.setItem(`user_${address.toLowerCase()}`, JSON.stringify(updatedData))
    } catch (error) {
      console.error("Error adding activity:", error)
    }
  }

  // Clear user data
  const clearUserData = () => {
    if (!address) return

    try {
      localStorage.removeItem(`user_${address.toLowerCase()}`)
      setUserData(null)
    } catch (error) {
      console.error("Error clearing user data:", error)
    }
  }

  return {
    userData,
    isLoading,
    updateUserData,
    addActivity,
    clearUserData,
  }
}
