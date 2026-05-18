import axios from 'axios'
import { API_BASE_URL } from '../config'
import type { Client, DashboardSummary } from '../types/client'

const api = axios.create({ baseURL: API_BASE_URL })

export const getClients = async (params?: {
  q?: string
  paymentStatus?: 'all' | 'pending' | 'paid' | 'overdue'
  followUpState?: 'all' | 'due' | 'upcoming' | 'none'
  tag?: string
}) => {
  const { data } = await api.get<Client[]>('/api/clients', { params })
  return data
}

export const createClient = async (payload: Partial<Client>) => {
  const { data } = await api.post<Client>('/api/clients', payload)
  return data
}

export const updateClient = async (id: string, payload: Partial<Client>) => {
  const { data } = await api.put<Client>(`/api/clients/${id}`, payload)
  return data
}

export const deleteClient = async (id: string) => {
  await api.delete(`/api/clients/${id}`)
}

export const bulkUpdateClients = async (payload: { clientIds: string[]; update: Partial<Client> }) => {
  const { data } = await api.post<{ matchedCount: number; modifiedCount: number }>(
    '/api/clients/bulk-update',
    payload
  )
  return data
}

export const bulkDeleteClients = async (payload: { clientIds: string[] }) => {
  const { data } = await api.post<{ deletedCount: number }>('/api/clients/bulk-delete', payload)
  return data
}

export const sendBulkMessage = async (payload: {
  message?: string
  mode: 'all' | 'selected'
  clientIds: string[]
  contentSid?: string
  contentVariables?: Record<string, string>
}) => {
  const { data } = await api.post<{
    sentCount: number
    failedCount: number
    total: number
    failedDetails?: string[]
    message?: string
  }>('/api/messages/bulk', payload)
  return data
}

export const getDashboardSummary = async () => {
  const { data } = await api.get<DashboardSummary>('/api/dashboard/summary')
  return data
}

export const getPendingFollowUpQueue = async (limit = 8) => {
  const { data } = await api.get<Client[]>('/api/dashboard/follow-ups', { params: { limit } })
  return data
}

export const getPendingPaymentQueue = async (limit = 8) => {
  const { data } = await api.get<Client[]>('/api/dashboard/payments', { params: { limit } })
  return data
}

export const sendFollowUpRemindersNow = async (clientIds: string[]) => {
  const { data } = await api.post<{ sentCount: number; failedCount: number; total: number; failedDetails?: string[] }>(
    '/api/dashboard/follow-ups/send-reminders',
    { clientIds }
  )
  return data
}

export const sendPaymentRemindersNow = async (clientIds: string[]) => {
  const { data } = await api.post<{ sentCount: number; failedCount: number; total: number; failedDetails?: string[] }>(
    '/api/dashboard/payments/send-reminders',
    { clientIds }
  )
  return data
}

export const snoozeFollowUp = async (payload: { clientId: string; days?: number }) => {
  const { data } = await api.post<{ ok: boolean; followUpDate?: string }>('/api/dashboard/follow-ups/snooze', payload)
  return data
}

export const markFollowUpComplete = async (clientIds: string[]) => {
  const { data } = await api.post<{ matchedCount: number; modifiedCount: number }>(
    '/api/dashboard/follow-ups/mark-complete',
    { clientIds }
  )
  return data
}

export const markPaymentsPaid = async (clientIds: string[]) => {
  const { data } = await api.post<{ matchedCount: number; modifiedCount: number }>(
    '/api/dashboard/payments/mark-paid',
    { clientIds }
  )
  return data
}
