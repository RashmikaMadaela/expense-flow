import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency values
export function formatCurrency(cents: number, currency: string = 'LKR'): string {
  const amount = cents / 100
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

// Convert dollars to cents for database storage
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

// Convert cents to dollars for display
export function centsToDollars(cents: number): number {
  return cents / 100
}

// Generate unique IDs (alternative to database-generated)
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Calculate split amounts for equal division
export function calculateEqualSplit(totalAmount: number, participantCount: number): number[] {
  const baseAmount = Math.floor(totalAmount / participantCount)
  const remainder = totalAmount % participantCount
  
  const splits = new Array(participantCount).fill(baseAmount)
  
  // Distribute remainder among first participants
  for (let i = 0; i < remainder; i++) {
    splits[i] += 1
  }
  
  return splits
}

// Date formatting
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}