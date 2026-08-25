export type UserRole = 'ADMIN' | 'RESIDENT' | 'MANAGER'
export type DueStatus = 'PENDING' | 'PAID' | 'OVERDUE'
export type DueType = 'AIDAT' | 'KIRA' | 'FATURA' | 'DIGER'
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface Site {
  id: string
  name: string
  address: string
  phone: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface Block {
  id: string
  siteId: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Apartment {
  id: string
  blockId: string
  ownerId?: string | null
  residentId?: string | null
  apartmentNumber: string
  floor: number
  apartmentType: string
  tapuNumber: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Owner {
  id: string
  apartmentId: string
  fullName: string
  phone: string
  email: string
  idNumber: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Tenant {
  id: string
  apartmentId: string
  fullName: string
  phone: string
  email: string
  idNumber: string
  moveInDate?: string | null
  moveOutDate?: string | null
  monthlyRent?: number | null
  monthlyDue?: number | null
  defaultBillSupport?: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UserRecord {
  id: string
  email: string
  fullName: string
  phone: string
  role: UserRole
  isActive: boolean
  createdAt: string
}

export interface Due {
  id: string
  apartmentId: string
  tenantId?: string | null
  dueType: DueType
  amount: number
  period: string
  dueDate: string
  status: DueStatus
  electricityAmount?: number | null
  waterAmount?: number | null
  gasAmount?: number | null
  billSupportAmount?: number | null
  grossAmount?: number | null
  description?: string | null
  totalPaid: number
  remainingAmount: number
  isOverdue: boolean
  daysOverdue: number
}

export interface Payment {
  id: string
  dueId: string
  amountPaid: number
  paymentDate: string
  paymentMethod: string
}

export interface Expense {
  id: string
  title: string
  amount: number
  category: string
  expenseDate: string
  invoiceUrl: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  createdBy: string
  createdAt: string
}

export interface Ticket {
  id: string
  userId: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  createdAt: string
}

export interface PropertyDocument {
  id: string
  entityType: string
  entityId: string
  documentCategory: string
  fileName: string
  fileUrl: string
  notes: string
  createdAt: string
}

export interface AuditLog {
  id: string
  userId?: string | null
  action: string
  entityName: string
  entityId: string
  timestamp: string
  details: string
}

export interface Session {
  userId: string
  email: string
  fullName?: string
  role: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
}

export interface FinanceTrendPoint {
  month: string
  amount: number
}

export interface OverdueDueSummary {
  dueId: string
  apartmentId: string
  apartmentNumber: string
  siteName: string
  amount: number
  remainingAmount: number
  daysOverdue: number
}

export interface FinanceReport {
  totalDues: number
  totalCollected: number
  outstandingAmount: number
  overdueCount: number
  paidCount: number
  pendingCount: number
  monthlyCollections: FinanceTrendPoint[]
  monthlyExpenses: FinanceTrendPoint[]
  topOverdueDues: OverdueDueSummary[]
}

export interface DashboardData {
  sites: Site[]
  blocks: Block[]
  apartments: Apartment[]
  owners: Owner[]
  tenants: Tenant[]
  dues: Due[]
  payments: Payment[]
  expenses: Expense[]
  announcements: Announcement[]
  tickets: Ticket[]
  auditLogs: AuditLog[]
  users: UserRecord[]
}

