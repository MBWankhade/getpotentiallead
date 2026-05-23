export type PaymentStatus = 'pending' | 'paid' | 'overdue'

export type Client = {
  _id: string
  name: string
  phone: string
  email?: string
  city?: string
  customerStatus?: 'Interested' | 'Converted' | 'Inactive'
  followUpStatus?: 'Pending' | 'Completed'
  tags?: string[]
  notes?: string
  lastFollowUpDate?: string
  nextFollowUpDate?: string
  followUpDate?: string
  birthday?: string
  weddingAnniversary?: string
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
