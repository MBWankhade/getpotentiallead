export type PaymentStatus = 'pending' | 'paid' | 'overdue'

export type Client = {
  _id: string
  name: string
  phone: string
  email?: string
  tags?: string[]
  notes?: string
  followUpDate?: string
  birthday?: string
  anniversary?: string
  paymentDueAmount?: number
  paymentDueDate?: string
  paymentStatus?: PaymentStatus
}

export type DashboardSummary = {
  totalClients: number
  pendingFollowUps: number
  pendingPayments: number
}
