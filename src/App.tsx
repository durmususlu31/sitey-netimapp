import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  fetchDashboardData,
  createRecord,
  updateRecord,
  deleteRecord as dbDeleteRecord,
  recordPayment,
  fetchEntityDocuments,
  createPropertyDocument,
  deletePropertyDocument,
  bulkCreateDues,
  computeFinanceReport,
} from './services/dbService'
import {
  loginUser,
  logoutUser,
} from './services/authService'

type DashboardTab =
  | 'overview'
  | 'sites'
  | 'blocks'
  | 'apartments'
  | 'owners'
  | 'tenants'
  | 'finance'
  | 'announcements'
  | 'tickets'
  | 'audit'

type CrudEntity = 'sites' | 'blocks' | 'apartments' | 'owners' | 'tenants' | 'dues' | 'expenses'
type DocumentCrudEntity = Exclude<CrudEntity, 'blocks' | 'expenses'>
type FilterSection = CrudEntity | 'announcements' | 'tickets'
type FinanceSubTab = 'overview' | 'dues' | 'payments' | 'expenses'

type Session = {
  userId: string
  email: string
  role: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
}

type NoticeState = {
  type: 'success' | 'error'
  text: string
}

type Site = { id: string; name: string; address: string; phone: string; email: string; createdAt: string; updatedAt: string }
type Block = { id: string; siteId: string; name: string; createdAt: string; updatedAt: string }
type Apartment = { id: string; blockId: string; ownerId?: string | null; residentId?: string | null; apartmentNumber: string; floor: number; apartmentType: string; tapuNumber: string; isActive: boolean; createdAt: string; updatedAt: string }
type Owner = { id: string; apartmentId: string; fullName: string; phone: string; email: string; idNumber: string; isActive: boolean; createdAt: string; updatedAt: string }
type Tenant = {
  id: string
  apartmentId: string
  fullName: string
  phone: string
  email: string
  idNumber: string
  moveInDate?: string | null
  moveOutDate?: string | null
  isActive: boolean
  monthlyRent?: number | null
  monthlyDue?: number | null
  defaultBillSupport?: number | null
  createdAt: string
  updatedAt: string
}
type DueType = 'AIDAT' | 'KIRA' | 'FATURA' | 'DIGER'
type Due = {
  id: string
  apartmentId: string
  tenantId?: string | null
  dueType: DueType
  amount: number
  period: string
  dueDate: string
  status: string
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
type Payment = { id: string; dueId: string; amountPaid: number; paymentDate: string; paymentMethod: string }
type Expense = { id: string; title: string; amount: number; category: string; expenseDate: string; invoiceUrl: string }
type Announcement = { id: string; title: string; content: string; createdBy: string; createdAt: string }
type Ticket = { id: string; userId: string; title: string; description: string; status: string; priority: string; createdAt: string }
type AuditLog = { id: string; userId?: string | null; action: string; entityName: string; entityId: string; timestamp: string; details: string }
type UserRecord = { id: string; email: string; fullName: string; phone: string; role: string; isActive: boolean; createdAt: string }
type PropertyDocument = {
  id: string
  entityType: string
  entityId: string
  documentCategory: string
  fileName: string
  fileUrl: string
  notes: string
  createdAt: string
}
type FinanceTrendPoint = { month: string; amount: number }
type OverdueDueSummary = {
  dueId: string
  apartmentId: string
  apartmentNumber: string
  siteName: string
  amount: number
  remainingAmount: number
  daysOverdue: number
}
type FinanceReport = {
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

type BulkImportRow = {
  siteName: string
  blockName: string
  apartmentNumber: string
  period: string
  dueDate: string
  dueType: string
  amount: number
  electricityAmount?: number
  waterAmount?: number
  gasAmount?: number
  billSupportAmount?: number
  description?: string
}

type BulkDueModalState = {
  scope: 'selected' | 'all' | 'site' | 'block'
  siteId: string
  blockId: string
  apartmentIds: string[]
  period: string
  dueDate: string
  dueType: string
  amountMode: 'FIXED' | 'TENANT_DEFAULT'
  fixedAmount: number
  electricityAmount?: number
  waterAmount?: number
  gasAmount?: number
  billSupportAmount?: number
  description: string
  skipDuplicates: boolean
}

type BulkImportModalState = {
  rawCsvText: string
  parsedRows: BulkImportRow[]
  logs: string[]
  completed: boolean
}

type DashboardData = {
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

type CrudModalState = {
  entity: CrudEntity
  mode: 'create' | 'edit'
  id?: string
}

type DetailModalState = {
  entity: CrudEntity
  id: string
}

type FormFieldValue = string | number | boolean | null

type SelectOption = {
  label: string
  value: string
}

type CrudConfig = {
  endpoint: string
  title: string
  createLabel: string
  fields: {
    key: string
    label: string
    type?: 'text' | 'email' | 'number' | 'date' | 'select' | 'checkbox'
    placeholder?: string
    helpText?: string
    required?: boolean
    selectOptions?: (data: DashboardData) => SelectOption[]
  }[]
  getInitialValues: () => Record<string, FormFieldValue>
  setValuesFromRow: (row: Record<string, unknown>) => Record<string, FormFieldValue>
  toPayload: (values: Record<string, FormFieldValue>) => Record<string, unknown>
}

type FilterState = {
  search: string
  sortBy: string
  sortDirection: 'asc' | 'desc'
  status: string
  activity: string
  siteId?: string
  month?: string
  dueType?: string
}

const NAV_GROUPS: {
  title?: string
  items: { key: DashboardTab; label: string }[]
}[] = [
  {
    title: 'Yönetim',
    items: [
      { key: 'overview', label: 'Genel Bakış' },
      { key: 'sites', label: 'Siteler' },
      { key: 'blocks', label: 'Bloklar' },
      { key: 'apartments', label: 'Daireler' },
    ],
  },
  {
    title: 'Sakinler',
    items: [
      { key: 'owners', label: 'Kat Malikleri' },
      { key: 'tenants', label: 'Kiracılar' },
    ],
  },
  {
    title: 'Finans ve Operasyon',
    items: [
      { key: 'finance', label: 'Finans ve Kasa' },
      { key: 'announcements', label: 'Duyurular' },
      { key: 'tickets', label: 'Destek Talepleri' },
      { key: 'audit', label: 'Denetim Kayıtları' },
    ],
  },
]

const TAB_LABELS: Record<DashboardTab, string> = {
  overview: 'Genel Bakış',
  sites: 'Siteler',
  blocks: 'Bloklar',
  apartments: 'Daireler',
  owners: 'Kat Malikleri',
  tenants: 'Kiracılar',
  finance: 'Finans ve Kasa',
  announcements: 'Duyurular',
  tickets: 'Destek Talepleri',
  audit: 'Denetim Kayıtları',
}

const DEFAULT_CREDENTIALS = {
  email: 'admin@site.com',
  password: 'Admin@123',
}

const DEFAULT_DOCUMENT_FORM = {
  documentCategory: '',
  fileName: '',
  fileUrl: '',
  notes: '',
}

const DEFAULT_FILTERS: Record<FilterSection, FilterState> = {
  sites: { search: '', sortBy: 'name', sortDirection: 'asc', status: 'all', activity: 'all' },
  blocks: { search: '', sortBy: 'name', sortDirection: 'asc', status: 'all', activity: 'all' },
  apartments: { search: '', sortBy: 'floor', sortDirection: 'asc', status: 'all', activity: 'all' },
  owners: { search: '', sortBy: 'fullName', sortDirection: 'asc', status: 'all', activity: 'all' },
  tenants: { search: '', sortBy: 'fullName', sortDirection: 'asc', status: 'all', activity: 'all' },
  dues: { search: '', sortBy: 'dueDate', sortDirection: 'desc', status: 'all', activity: 'all', siteId: 'all', month: 'all', dueType: 'all' },
  expenses: { search: '', sortBy: 'expenseDate', sortDirection: 'desc', status: 'all', activity: 'all' },
  announcements: { search: '', sortBy: 'createdAt', sortDirection: 'desc', status: 'all', activity: 'all' },
  tickets: { search: '', sortBy: 'createdAt', sortDirection: 'desc', status: 'all', activity: 'all' },
}

const DOCUMENT_ENTITY_TYPES: Record<DocumentCrudEntity, string> = {
  sites: 'SITE',
  apartments: 'APARTMENT',
  owners: 'OWNER',
  tenants: 'TENANT',
  dues: 'DUE',
}

const CRUD_CONFIG: Record<CrudEntity, CrudConfig> = {
  sites: {
    endpoint: '/api/sites',
    title: 'Site',
    createLabel: 'Yeni site',
    fields: [
      { key: 'name', label: 'Ad', type: 'text', required: true },
      { key: 'address', label: 'Adres', type: 'text', required: true },
      { key: 'phone', label: 'Telefon', type: 'text' },
      { key: 'email', label: 'E-posta', type: 'email' },
    ],
    getInitialValues: () => ({ name: '', address: '', phone: '', email: '' }),
    setValuesFromRow: (row) => ({
      name: String(row.name ?? ''),
      address: String(row.address ?? ''),
      phone: String(row.phone ?? ''),
      email: String(row.email ?? ''),
    }),
    toPayload: (values) => ({
      name: String(values.name ?? ''),
      address: String(values.address ?? ''),
      phone: String(values.phone ?? ''),
      email: String(values.email ?? ''),
    }),
  },
  blocks: {
    endpoint: '/api/blocks',
    title: 'Blok',
    createLabel: 'Yeni blok',
    fields: [
      {
        key: 'siteId',
        label: 'Site',
        type: 'select',
        placeholder: 'Site seçin',
        required: true,
        helpText: 'Bloğu bağlamak istediğiniz siteyi seçin.',
        selectOptions: (data) =>
          [...data.sites]
            .sort((left, right) => left.name.localeCompare(right.name, 'tr-TR'))
            .map((site) => ({ label: site.name, value: site.id })),
      },
      { key: 'name', label: 'Blok adı', type: 'text', required: true, helpText: 'Örn. A Blok, B1, C Kule.' },
    ],
    getInitialValues: () => ({ siteId: '', name: '' }),
    setValuesFromRow: (row) => ({
      siteId: String(row.siteId ?? ''),
      name: String(row.name ?? ''),
    }),
    toPayload: (values) => ({
      siteId: values.siteId ? values.siteId : null,
      name: String(values.name ?? ''),
    }),
  },
  apartments: {
    endpoint: '/api/apartments',
    title: 'Daire',
    createLabel: 'Yeni daire',
    fields: [
      {
        key: 'blockId',
        label: 'Blok',
        type: 'select',
        placeholder: '— Blok Seçin —',
        required: true,
        helpText: 'Dairenin bağlı olduğu bloğu seçin (Site / Blok).',
        selectOptions: (data) =>
          [...data.blocks]
            .sort((left, right) => getBlockDisplayLabel(left, data).localeCompare(getBlockDisplayLabel(right, data), 'tr-TR'))
            .map((block) => ({ label: getBlockDisplayLabel(block, data), value: block.id })),
      },
      {
        key: 'ownerId',
        label: 'Kat Maliki (Sahip)',
        type: 'select',
        placeholder: '— Sahip Seçilmedi (İsteğe Bağlı) —',
        required: false,
        helpText: 'Dairenin tapu sahibi olan kişiyi seçin (İsteğe bağlı).',
        selectOptions: (data) => {
          const ownerOptions = data.owners.map((owner) => {
            const apt = data.apartments.find((a) => a.id === owner.apartmentId)
            const aptLabel = apt ? ` [${apt.apartmentNumber}]` : ''
            return {
              label: `👤 ${owner.fullName}${owner.phone ? ` (${owner.phone})` : ''}${aptLabel}`,
              value: owner.id,
            }
          })
          const userOptions = data.users
            .filter((u) => !data.owners.some((o) => o.id === u.id || o.email === u.email))
            .map((user) => ({
              label: `👤 ${user.fullName} (${user.email})`,
              value: user.id,
            }))
          return [...ownerOptions, ...userOptions]
        },
      },
      {
        key: 'residentId',
        label: 'Kiracı / Sakin',
        type: 'select',
        placeholder: '— Kiracı Yok / Boş Daire (İsteğe Bağlı) —',
        required: false,
        helpText: 'Dairede fiilen oturan kiracıyı seçin (İsteğe bağlı).',
        selectOptions: (data) => {
          const tenantOptions = data.tenants.map((tenant) => {
            const rent = tenant.monthlyRent ? ` - ${tenant.monthlyRent} ₺` : ''
            return {
              label: `🔑 ${tenant.fullName}${tenant.phone ? ` (${tenant.phone})` : ''}${rent}`,
              value: tenant.id,
            }
          })
          const userOptions = data.users
            .filter((u) => !data.tenants.some((t) => t.id === u.id || t.email === u.email))
            .map((user) => ({
              label: `🔑 ${user.fullName} (${user.email})`,
              value: user.id,
            }))
          return [...tenantOptions, ...userOptions]
        },
      },
      { key: 'apartmentNumber', label: 'Daire Numarası', type: 'text', required: true, helpText: 'Blok içindeki benzersiz daire no (Örn. D:1, No:5).' },
      { key: 'floor', label: 'Kat', type: 'number', required: true, helpText: 'Dairenin bulunduğu kat numarası.' },
      { key: 'apartmentType', label: 'Daire Tipi', type: 'text', required: true, helpText: 'Örn. 2+1, 3+1, Dubleks, Stüdyo.' },
      { key: 'tapuNumber', label: 'Tapu Numarası', type: 'text', required: false, helpText: 'Varsa resmi tapu numarasını girin (İsteğe bağlı).' },
      { key: 'isActive', label: 'Aktif Daire', type: 'checkbox' },
    ],
    getInitialValues: () => ({
      blockId: '',
      ownerId: '',
      residentId: '',
      apartmentNumber: '',
      floor: 1,
      apartmentType: '2+1',
      tapuNumber: '',
      isActive: true,
    }),
    setValuesFromRow: (row) => ({
      blockId: String(row.blockId ?? ''),
      ownerId: String(row.ownerId ?? ''),
      residentId: String(row.residentId ?? ''),
      apartmentNumber: String(row.apartmentNumber ?? ''),
      floor: Number(row.floor ?? 1),
      apartmentType: String(row.apartmentType ?? '2+1'),
      tapuNumber: String(row.tapuNumber ?? ''),
      isActive: Boolean(row.isActive ?? true),
    }),
    toPayload: (values) => ({
      blockId: values.blockId ? String(values.blockId) : null,
      ownerId: values.ownerId ? String(values.ownerId) : null,
      residentId: values.residentId ? String(values.residentId) : null,
      apartmentNumber: String(values.apartmentNumber ?? '').trim(),
      floor: Number(values.floor ?? 1),
      apartmentType: String(values.apartmentType ?? '2+1').trim(),
      tapuNumber: values.tapuNumber ? String(values.tapuNumber).trim() : null,
      isActive: Boolean(values.isActive ?? true),
    }),
  },
  owners: {
    endpoint: '/api/owners',
    title: 'Sahip',
    createLabel: 'Yeni sahip',
    fields: [
      {
        key: 'apartmentId',
        label: 'Daire',
        type: 'select',
        placeholder: 'Daire seçin',
        required: true,
        helpText: 'Bu kaydı hangi daireye bağlamak istediğinizi seçin.',
        selectOptions: (data) =>
          [...data.apartments]
            .sort((left, right) =>
              getApartmentDisplayLabel(left, data).localeCompare(getApartmentDisplayLabel(right, data), 'tr-TR'),
            )
            .map((apartment) => ({ label: getApartmentDisplayLabel(apartment, data), value: apartment.id })),
      },
      { key: 'fullName', label: 'Ad soyad', type: 'text', required: true, helpText: 'Kişinin sistemde görünecek tam adı.' },
      { key: 'phone', label: 'Telefon', type: 'text', helpText: 'İletişim için cep telefonu.' },
      { key: 'email', label: 'E-posta', type: 'email', helpText: 'İsteğe bağlı, geçerli bir e-posta adresi.' },
      { key: 'idNumber', label: 'Kimlik numarası', type: 'text', helpText: 'Opsiyonel kimlik veya vergi numarası.' },
      { key: 'isActive', label: 'Aktif', type: 'checkbox' },
    ],
    getInitialValues: () => ({ apartmentId: '', fullName: '', phone: '', email: '', idNumber: '', isActive: true }),
    setValuesFromRow: (row) => ({
      apartmentId: String(row.apartmentId ?? ''),
      fullName: String(row.fullName ?? ''),
      phone: String(row.phone ?? ''),
      email: String(row.email ?? ''),
      idNumber: String(row.idNumber ?? ''),
      isActive: Boolean(row.isActive ?? true),
    }),
    toPayload: (values) => ({
      apartmentId: values.apartmentId ? values.apartmentId : null,
      fullName: String(values.fullName ?? ''),
      phone: String(values.phone ?? ''),
      email: String(values.email ?? ''),
      idNumber: String(values.idNumber ?? ''),
      isActive: Boolean(values.isActive ?? true),
    }),
  },
  tenants: {
    endpoint: '/api/tenants',
    title: 'Kiracı',
    createLabel: 'Yeni kiracı',
    fields: [
      {
        key: 'apartmentId',
        label: 'Daire',
        type: 'select',
        placeholder: 'Daire seçin',
        required: true,
        helpText: 'Aidatın bağlı olduğu daireyi seçin.',
        selectOptions: (data) =>
          [...data.apartments]
            .sort((left, right) =>
              getApartmentDisplayLabel(left, data).localeCompare(getApartmentDisplayLabel(right, data), 'tr-TR'),
            )
            .map((apartment) => ({ label: getApartmentDisplayLabel(apartment, data), value: apartment.id })),
      },
      { key: 'fullName', label: 'Ad soyad', type: 'text', required: true, helpText: 'Kişinin sistemde görünecek tam adı.' },
      { key: 'phone', label: 'Telefon', type: 'text', required: true, helpText: 'İletişim için cep telefonu.' },
      { key: 'email', label: 'E-posta', type: 'email', helpText: 'İsteğe bağlı, geçerli bir e-posta adresi.' },
      { key: 'idNumber', label: 'Kimlik numarası', type: 'text', helpText: 'Opsiyonel kimlik veya vergi numarası.' },
      { key: 'moveInDate', label: 'Giriş tarihi', type: 'date', required: true, helpText: 'Kiracının taşınma tarihi.' },
      { key: 'moveOutDate', label: 'Çıkış tarihi', type: 'date', helpText: 'Varsa tahliye tarihi.' },
      { key: 'monthlyRent', label: 'Aylık kira (₺)', type: 'number', helpText: 'Varsayılan aylık kira tutarı (Örn. 22000).' },
      { key: 'monthlyDue', label: 'Aylık aidat (₺)', type: 'number', helpText: 'Varsayılan aylık aidat tutarı (Örn. 2000).' },
      { key: 'defaultBillSupport', label: 'Fatura desteği (₺)', type: 'number', helpText: 'Aylık fatura desteği/indirimi (Örn. 2000).' },
      { key: 'isActive', label: 'Aktif', type: 'checkbox' },
    ],
    getInitialValues: () => ({ apartmentId: '', fullName: '', phone: '', email: '', idNumber: '', moveInDate: '', moveOutDate: '', monthlyRent: 0, monthlyDue: 0, defaultBillSupport: 0, isActive: true }),
    setValuesFromRow: (row) => ({
      apartmentId: String(row.apartmentId ?? ''),
      fullName: String(row.fullName ?? ''),
      phone: String(row.phone ?? ''),
      email: String(row.email ?? ''),
      idNumber: String(row.idNumber ?? ''),
      moveInDate: row.moveInDate ? String(row.moveInDate).slice(0, 10) : '',
      moveOutDate: row.moveOutDate ? String(row.moveOutDate).slice(0, 10) : '',
      monthlyRent: Number(row.monthlyRent ?? 0),
      monthlyDue: Number(row.monthlyDue ?? 0),
      defaultBillSupport: Number(row.defaultBillSupport ?? 0),
      isActive: Boolean(row.isActive ?? true),
    }),
    toPayload: (values) => ({
      apartmentId: values.apartmentId ? values.apartmentId : null,
      fullName: String(values.fullName ?? ''),
      phone: String(values.phone ?? ''),
      email: String(values.email ?? ''),
      idNumber: String(values.idNumber ?? ''),
      moveInDate: values.moveInDate ? new Date(String(values.moveInDate)).toISOString() : null,
      moveOutDate: values.moveOutDate ? new Date(String(values.moveOutDate)).toISOString() : null,
      monthlyRent: values.monthlyRent ? Number(values.monthlyRent) : null,
      monthlyDue: values.monthlyDue ? Number(values.monthlyDue) : null,
      defaultBillSupport: values.defaultBillSupport ? Number(values.defaultBillSupport) : null,
      isActive: Boolean(values.isActive ?? true),
    }),
  },
  dues: {
    endpoint: '/api/dues',
    title: 'Aidat & Tahakkuk',
    createLabel: 'Yeni tahakkuk',
    fields: [
      {
        key: 'apartmentId',
        label: 'Daire',
        type: 'select',
        placeholder: 'Daire seçin',
        required: true,
        selectOptions: (data) =>
          [...data.apartments]
            .sort((left, right) =>
              getApartmentDisplayLabel(left, data).localeCompare(getApartmentDisplayLabel(right, data), 'tr-TR'),
            )
            .map((apartment) => ({ label: getApartmentDisplayLabel(apartment, data), value: apartment.id })),
      },
      {
        key: 'dueType',
        label: 'Kalem türü',
        type: 'select',
        required: true,
        helpText: 'Aidat, Kira veya Fatura seçin.',
        selectOptions: () => [
          { label: 'Aidat', value: 'AIDAT' },
          { label: 'Kira', value: 'KIRA' },
          { label: 'Fatura / Destek', value: 'FATURA' },
          { label: 'Diğer', value: 'DIGER' },
        ],
      },
      { key: 'amount', label: 'Tutar (₺)', type: 'number', required: true, helpText: 'Net ödenecek tutar.' },
      { key: 'period', label: 'Dönem', type: 'text', required: true, helpText: 'Örn. 2026-08.' },
      { key: 'dueDate', label: 'Vade tarihi', type: 'date', required: true, helpText: 'Son ödeme tarihi.' },
      { key: 'description', label: 'Açıklama', type: 'text', helpText: 'Örn. Ağustos Kira Bedeli, Doğalgaz Faturası vb.' },
      { key: 'status', label: 'Durum', type: 'select', required: true },
    ],
    getInitialValues: () => ({ apartmentId: '', dueType: 'AIDAT', amount: 0, period: '', dueDate: '', description: '', status: 'PENDING' }),
    setValuesFromRow: (row) => ({
      apartmentId: String(row.apartmentId ?? ''),
      dueType: String(row.dueType ?? 'AIDAT'),
      amount: Number(row.amount ?? 0),
      period: String(row.period ?? ''),
      dueDate: row.dueDate ? String(row.dueDate).slice(0, 10) : '',
      description: String(row.description ?? ''),
      status: String(row.status ?? 'PENDING'),
    }),
    toPayload: (values) => ({
      apartmentId: values.apartmentId ? values.apartmentId : null,
      dueType: String(values.dueType ?? 'AIDAT'),
      amount: Number(values.amount ?? 0),
      period: String(values.period ?? ''),
      dueDate: values.dueDate ? new Date(String(values.dueDate)).toISOString() : new Date().toISOString(),
      description: values.description ? String(values.description) : null,
      status: String(values.status ?? 'PENDING'),
    }),
  },
  expenses: {
    endpoint: '/api/expenses',
    title: 'Giderler',
    createLabel: 'Yeni gider',
    fields: [
      {
        key: 'title',
        label: 'Gider Başlığı',
        type: 'text',
        required: true,
        helpText: 'Örn. Asansör Bakımı, Temizlik Malzemeleri, Güvenlik Hizmeti.',
      },
      {
        key: 'category',
        label: 'Kategori',
        type: 'select',
        required: true,
        helpText: 'Gider kategorisini seçin.',
        selectOptions: () => [
          { label: 'Bakım & Onarım', value: 'Bakım & Onarım' },
          { label: 'Temizlik', value: 'Temizlik' },
          { label: 'Güvenlik', value: 'Güvenlik' },
          { label: 'Personel & Maaş', value: 'Personel & Maaş' },
          { label: 'Elektrik & Su Ortak Alan', value: 'Elektrik & Su Ortak Alan' },
          { label: 'Yönetim & İdari', value: 'Yönetim & İdari' },
          { label: 'Diğer', value: 'Diğer' },
        ],
      },
      { key: 'amount', label: 'Tutar (₺)', type: 'number', required: true, helpText: 'Harcama tutarı.' },
      { key: 'expenseDate', label: 'Harcama Tarihi', type: 'date', required: true, helpText: 'Giderin gerçekleştiği tarih.' },
      { key: 'invoiceUrl', label: 'Fatura / Fiş No veya Link', type: 'text', helpText: 'Örn. FT-2026-00123' },
    ],
    getInitialValues: () => ({
      title: '',
      category: 'Bakım & Onarım',
      amount: 0,
      expenseDate: new Date().toISOString().slice(0, 10),
      invoiceUrl: '',
    }),
    setValuesFromRow: (row) => ({
      title: String(row.title ?? ''),
      category: String(row.category ?? 'Bakım & Onarım'),
      amount: Number(row.amount ?? 0),
      expenseDate: row.expenseDate ? String(row.expenseDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
      invoiceUrl: String(row.invoiceUrl ?? ''),
    }),
    toPayload: (values) => ({
      title: String(values.title ?? ''),
      category: String(values.category ?? 'Bakım & Onarım'),
      amount: Number(values.amount ?? 0),
      expenseDate: values.expenseDate ? new Date(String(values.expenseDate)).toISOString() : new Date().toISOString(),
      invoiceUrl: String(values.invoiceUrl ?? ''),
    }),
  },
}

function getSession(): Session | null {
  const raw = localStorage.getItem('site-management-session')
  if (!raw) return null

  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

const SESSION_UPDATED_EVENT = 'site-management-session-updated'

function notifySessionUpdated() {
  window.dispatchEvent(new Event(SESSION_UPDATED_EVENT))
}

function saveSession(session: Session) {
  localStorage.setItem('site-management-session', JSON.stringify(session))
  notifySessionUpdated()
}

function clearSession() {
  localStorage.removeItem('site-management-session')
  notifySessionUpdated()
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number') return '—'
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value)
}

function statusClass(status?: string | number) {
  switch (String(status ?? '').toUpperCase()) {
    case 'PAID':
    case 'RESOLVED':
    case 'ADMIN':
    case 'ACTIVE':
      return 'status success'
    case 'PENDING':
    case 'OPEN':
    case 'IN_PROGRESS':
    case 'MEDIUM':
    case 'MANAGER':
      return 'status warning'
    case 'OVERDUE':
    case 'URGENT':
    case 'HIGH':
    case 'INACTIVE':
      return 'status danger'
    default:
      return 'status neutral'
  }
}

function translateStatus(value?: string | null) {
  switch (String(value ?? '').toUpperCase()) {
    case 'PAID':
      return 'Ödendi'
    case 'PENDING':
      return 'Beklemede'
    case 'OVERDUE':
      return 'Gecikmiş'
    case 'RESOLVED':
      return 'Çözüldü'
    case 'OPEN':
      return 'Açık'
    case 'IN_PROGRESS':
      return 'İşlemde'
    case 'URGENT':
      return 'Acil'
    case 'HIGH':
      return 'Yüksek'
    case 'MEDIUM':
      return 'Orta'
    case 'ADMIN':
      return 'Yönetici'
    case 'MANAGER':
      return 'Müdür'
    case 'ACTIVE':
      return 'Aktif'
    case 'INACTIVE':
      return 'Pasif'
    default:
      return value ?? '—'
  }
}

function translateDueType(type?: string | null) {
  switch (String(type ?? '').toUpperCase()) {
    case 'KIRA':
      return 'Kira'
    case 'FATURA':
      return 'Fatura / Destek'
    case 'DIGER':
      return 'Diğer'
    case 'AIDAT':
    default:
      return 'Aidat'
  }
}

function renderDueTypeBadge(type?: string | null) {
  const norm = String(type ?? 'AIDAT').toUpperCase()
  switch (norm) {
    case 'KIRA':
      return <span className="type-badge type-kira">Kira</span>
    case 'FATURA':
      return <span className="type-badge type-fatura">Fatura</span>
    case 'DIGER':
      return <span className="type-badge type-diger">Diğer</span>
    case 'AIDAT':
    default:
      return <span className="type-badge type-aidat">Aidat</span>
  }
}

function StatusPill({ value }: { value?: string | null }) {
  return <span className={statusClass(value ?? '')}>{translateStatus(value)}</span>
}

function normalizeText(value: unknown) {
  return String(value ?? '').toLocaleLowerCase('tr-TR')
}

function compareText(left: unknown, right: unknown) {
  return String(left ?? '').localeCompare(String(right ?? ''), 'tr-TR')
}

function compareNumber(left: unknown, right: unknown) {
  return Number(left ?? 0) - Number(right ?? 0)
}

function getApartmentDisplayLabel(apartment: Apartment, data: DashboardData) {
  const block = data.blocks.find((item) => item.id === apartment.blockId)
  const site = block ? data.sites.find((item) => item.id === block.siteId) : null
  const parts = [site?.name, block?.name, `Daire ${apartment.apartmentNumber}`].filter(Boolean)
  return parts.join(' / ')
}

function getBlockDisplayLabel(block: Block, data: DashboardData) {
  const site = data.sites.find((item) => item.id === block.siteId)
  return [site?.name, block.name].filter(Boolean).join(' / ')
}

function getUserDisplayLabel(user: UserRecord) {
  return [user.fullName, user.email, translateStatus(user.role)].filter(Boolean).join(' / ')
}

function getUserLabelById(users: UserRecord[], userId: string) {
  const user = users.find((item) => item.id === userId)
  return user ? getUserDisplayLabel(user) : userId
}

function downloadCsvFile(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const content = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(','),
    ),
  ].join('\n')

  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function parseDuesCsv(text: string): BulkImportRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  if (lines.length <= 1) return []

  const rows: BulkImportRow[] = []
  const defaultDueDate = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
  const defaultPeriod = new Date().toISOString().slice(0, 7)

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i]
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''))
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''))

    // Headers: Site, Blok, DaireNo, Dönem, Tür, Tutar, Elektrik, Su, Doğalgaz, Destek, VadeTarihi, Açıklama
    if (values.length >= 3 && values[2]) {
      rows.push({
        siteName: values[0] || '',
        blockName: values[1] || '',
        apartmentNumber: values[2] || '',
        period: values[3] || defaultPeriod,
        dueType: (values[4] || 'AIDAT').toUpperCase(),
        amount: Number(values[5] || 0),
        electricityAmount: values[6] ? Number(values[6]) : undefined,
        waterAmount: values[7] ? Number(values[7]) : undefined,
        gasAmount: values[8] ? Number(values[8]) : undefined,
        billSupportAmount: values[9] ? Number(values[9]) : undefined,
        dueDate: values[10] || defaultDueDate,
        description: values[11] || '',
      })
    }
  }

  return rows
}


function getDetailBreadcrumb(detailModal: DetailModalState | null, detailRecord: Record<string, unknown> | null, data: DashboardData) {
  if (!detailModal || !detailRecord) return []

  if (detailModal.entity === 'sites') {
    return [TAB_LABELS.sites, String(detailRecord.name ?? '—')]
  }

  if (detailModal.entity === 'blocks') {
    const block = detailRecord as unknown as Block
    const site = data.sites.find((item) => item.id === block.siteId)
    return [TAB_LABELS.sites, site?.name ?? '—', TAB_LABELS.blocks, block.name]
  }

  if (detailModal.entity === 'apartments') {
    const apartment = detailRecord as unknown as Apartment
    const block = data.blocks.find((item) => item.id === apartment.blockId)
    const site = block ? data.sites.find((item) => item.id === block.siteId) : null
    return [TAB_LABELS.sites, site?.name ?? '—', TAB_LABELS.blocks, block?.name ?? '—', TAB_LABELS.apartments, `Daire ${apartment.apartmentNumber}`]
  }

  if (detailModal.entity === 'owners') {
    const owner = detailRecord as unknown as Owner
    const apartment = data.apartments.find((item) => item.id === owner.apartmentId)
    const block = apartment ? data.blocks.find((item) => item.id === apartment.blockId) : null
    const site = block ? data.sites.find((item) => item.id === block.siteId) : null
    return [TAB_LABELS.sites, site?.name ?? '—', TAB_LABELS.blocks, block?.name ?? '—', TAB_LABELS.apartments, apartment?.apartmentNumber ?? '—', TAB_LABELS.owners, owner.fullName]
  }

  if (detailModal.entity === 'tenants') {
    const tenant = detailRecord as unknown as Tenant
    const apartment = data.apartments.find((item) => item.id === tenant.apartmentId)
    const block = apartment ? data.blocks.find((item) => item.id === apartment.blockId) : null
    const site = block ? data.sites.find((item) => item.id === block.siteId) : null
    return [TAB_LABELS.sites, site?.name ?? '—', TAB_LABELS.blocks, block?.name ?? '—', TAB_LABELS.apartments, apartment?.apartmentNumber ?? '—', TAB_LABELS.tenants, tenant.fullName]
  }

  if (detailModal.entity === 'dues') {
    const due = detailRecord as unknown as Due
    const apartment = data.apartments.find((item) => item.id === due.apartmentId)
    const block = apartment ? data.blocks.find((item) => item.id === apartment.blockId) : null
    const site = block ? data.sites.find((item) => item.id === block.siteId) : null
    return [TAB_LABELS.sites, site?.name ?? '—', TAB_LABELS.blocks, block?.name ?? '—', TAB_LABELS.apartments, apartment?.apartmentNumber ?? '—', 'Aidatlar', due.period]
  }

  return []
}

function ResourceTable<T extends Record<string, unknown>>({
  title,
  rows,
  columns,
  onCreate,
  onEdit,
  onView,
  onDelete,
  createLabel,
  toolbar,
  emptyMessage,
  selectable,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  headerActions,
}: {
  title: string
  rows: T[]
  columns: { key: string; label: string; render?: (row: T) => React.ReactNode }[]
  onCreate?: () => void
  onEdit?: (row: T) => void
  onView?: (row: T) => void
  onDelete?: (row: T) => void
  createLabel?: string
  toolbar?: React.ReactNode
  emptyMessage?: string
  selectable?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
  onToggleSelectAll?: () => void
  headerActions?: React.ReactNode
}) {
  const allSelected = selectable && rows.length > 0 && rows.every((r) => selectedIds?.has(String(r.id)))

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <h3>{title}</h3>
        </div>
        <div className="panel-actions">
          {headerActions}
          {onCreate ? (
            <button type="button" className="primary-button small" onClick={onCreate}>
              + {createLabel ?? 'Yeni kayıt'}
            </button>
          ) : null}
          <span className="badge muted">{rows.length} kayıt</span>
        </div>
      </div>

      {toolbar ? <div className="table-toolbar">{toolbar}</div> : null}

      {!rows.length ? (
        <div className="empty-state" style={{ padding: '32px 20px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>{emptyMessage ?? 'Kayıt bulunamadı.'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {selectable ? (
                  <th style={{ width: '36px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={onToggleSelectAll}
                      title="Tümünü Seç / Kaldır"
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                ) : null}
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
                {onEdit || onView || onDelete ? <th key="actions">İşlemler</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const rowId = String(row.id ?? `${title}-${index}`)
                const isSelected = selectedIds?.has(rowId)
                return (
                  <tr key={rowId} style={isSelected ? { background: '#eff6ff' } : undefined}>
                    {selectable ? (
                      <td style={{ width: '36px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected ?? false}
                          onChange={() => onToggleSelect?.(rowId)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td key={`${column.key}-${rowId}`}>
                        {column.render ? column.render(row) : String(row[column.key] ?? '—')}
                      </td>
                    ))}
                    {onEdit || onView || onDelete ? (
                      <td>
                        <div className="row-actions">
                          {onView ? (
                            <button
                              type="button"
                              className="table-action primary"
                              title="Detay Görüntüle"
                              onClick={() => onView(row)}
                            >
                              Detay
                            </button>
                          ) : null}
                          {onEdit ? (
                            <button
                              type="button"
                              className="table-action"
                              title="Düzenle"
                              onClick={() => onEdit(row)}
                            >
                              Düzenle
                            </button>
                          ) : null}
                          {onDelete ? (
                            <button
                              type="button"
                              className="table-action danger"
                              title="Sil"
                              onClick={() => onDelete(row)}
                            >
                              Sil
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding: '10px 16px', background: 'var(--color-paper-mist)', borderTop: '1px solid var(--color-ash)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-steel)' }}>
            <span>Toplam <strong>{rows.length}</strong> kayıt listeleniyor</span>
            <span style={{ fontSize: '11px', color: 'var(--color-fog)' }}>Canlı senkronize</span>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [session, setSession] = useState<Session | null>(getSession())
  const [loginForm, setLoginForm] = useState(DEFAULT_CREDENTIALS)
  const [loginError, setLoginError] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DashboardData>({
    sites: [],
    blocks: [],
    apartments: [],
    owners: [],
    tenants: [],
    dues: [],
    payments: [],
    expenses: [],
    announcements: [],
    tickets: [],
    auditLogs: [],
    users: [],
  })
  const [financeReport, setFinanceReport] = useState<FinanceReport | null>(null)
  const [crudModal, setCrudModal] = useState<CrudModalState | null>(null)
  const [editForm, setEditForm] = useState<Record<string, FormFieldValue>>({})
  const [detailModal, setDetailModal] = useState<DetailModalState | null>(null)
  const [propertyDocuments, setPropertyDocuments] = useState<PropertyDocument[]>([])
  const [documentForm, setDocumentForm] = useState(DEFAULT_DOCUMENT_FORM)
  const [documentLoading, setDocumentLoading] = useState(false)
  const [documentSaving, setDocumentSaving] = useState(false)
  const [filters, setFilters] = useState<Record<FilterSection, FilterState>>(DEFAULT_FILTERS)
  const [notice, setNotice] = useState<NoticeState | null>(null)
  const [selectedTenantMonth, setSelectedTenantMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [financeSubTab, setFinanceSubTab] = useState<FinanceSubTab>('overview')
  const [financeMonthFilter, setFinanceMonthFilter] = useState<string>('all')
  const [paymentConfirmModal, setPaymentConfirmModal] = useState<{
    due: Due
    tenant?: Tenant | null
    amount: number
    paymentMethod: string
    paymentDate: string
    notes: string
  } | null>(null)
  const [billModal, setBillModal] = useState<{
    tenant: Tenant
    period: string
    dueDate: string
    electricity: number
    water: number
    gas: number
    support: number
    description: string
  } | null>(null)
  const [selectedApartmentIds, setSelectedApartmentIds] = useState<Set<string>>(new Set())
  const [bulkDueModal, setBulkDueModal] = useState<BulkDueModalState | null>(null)
  const [bulkImportModal, setBulkImportModal] = useState<BulkImportModalState | null>(null)
  const [processingAction, setProcessingAction] = useState(false)
  const crudFormRef = useRef<HTMLFormElement | null>(null)

  useEffect(() => {
    const handleSessionUpdated = () => {
      setSession(getSession())
    }

    window.addEventListener(SESSION_UPDATED_EVENT, handleSessionUpdated)
    return () => {
      window.removeEventListener(SESSION_UPDATED_EVENT, handleSessionUpdated)
    }
  }, [])

  const loadDashboardData = async (_token?: string) => {
    setLoading(true)

    try {
      const dashboardData = await fetchDashboardData()
      setData(dashboardData)
      const finance = computeFinanceReport(dashboardData)
      setFinanceReport(finance)
    } catch (error) {
      console.error(error)
      setLoginError(error instanceof Error ? error.message : 'Pano verileri yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  const refreshDocuments = async (entity: DocumentCrudEntity, id: string, _token?: string) => {
    setDocumentLoading(true)
    try {
      const documents = await fetchEntityDocuments(DOCUMENT_ENTITY_TYPES[entity], id)
      setPropertyDocuments(documents)
    } catch (error) {
      console.error(error)
      setLoginError(error instanceof Error ? error.message : 'Dokümanlar yüklenemedi.')
      setPropertyDocuments([])
    } finally {
      setDocumentLoading(false)
    }
  }

  useEffect(() => {
    if (!session) return

    void loadDashboardData(session.accessToken)
  }, [session])

  const blocksById = useMemo(() => new Map(data.blocks.map((item) => [item.id, item])), [data.blocks])
  const sitesById = useMemo(() => new Map(data.sites.map((item) => [item.id, item])), [data.sites])
  const apartmentsById = useMemo(() => new Map(data.apartments.map((item) => [item.id, item])), [data.apartments])

  const getBlockName = (blockId: string) => blocksById.get(blockId)?.name ?? '—'
  const getSiteNameFromBlockId = (blockId: string) => {
    const block = blocksById.get(blockId)
    return block ? sitesById.get(block.siteId)?.name ?? '—' : '—'
  }
  const getApartmentLabel = (apartmentId: string) => apartmentsById.get(apartmentId)?.apartmentNumber ?? apartmentId
  const getSiteNameFromApartmentId = (apartmentId: string) => {
    const apartment = apartmentsById.get(apartmentId)
    return apartment ? getSiteNameFromBlockId(apartment.blockId) : '—'
  }

  const updateFilter = (section: FilterSection, patch: Partial<FilterState>) => {
    setFilters((current) => ({
      ...current,
      [section]: {
        ...current[section],
        ...patch,
      },
    }))
  }

  const showNotice = (type: NoticeState['type'], text: string) => {
    setNotice({ type, text })
    window.setTimeout(() => setNotice((current) => (current?.text === text ? null : current)), 2800)
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoginError('')

    try {
      const nextSession = await loginUser(loginForm.email, loginForm.password)
      saveSession(nextSession)
      setSession(nextSession)
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Giriş başarısız oldu.')
    }
  }

  const handleLogout = async () => {
    await logoutUser()
    clearSession()
    setSession(null)
    setActiveTab('overview')
    setCrudModal(null)
    setDetailModal(null)
    setPropertyDocuments([])
  }

  const openCreateModal = (entity: CrudEntity, initialValues?: Record<string, FormFieldValue>) => {
    const config = CRUD_CONFIG[entity]
    setCrudModal({ entity, mode: 'create' })
    setEditForm({ ...config.getInitialValues(), ...initialValues })
  }

  const openEditModal = (entity: CrudEntity, row: Record<string, unknown>) => {
    const config = CRUD_CONFIG[entity]
    setCrudModal({ entity, mode: 'edit', id: String(row.id ?? '') })
    setEditForm(config.setValuesFromRow(row))
  }

  const openDetailModal = async (entity: CrudEntity, row: Record<string, unknown>) => {
    if (!session) return
    const id = String(row.id ?? '')
    setDetailModal({ entity, id })
    setPropertyDocuments([])
    setDocumentForm(DEFAULT_DOCUMENT_FORM)
    if (entity !== 'blocks' && entity !== 'expenses') {
      await refreshDocuments(entity, id, session.accessToken)
    }
  }

  const updateField = (key: string, value: FormFieldValue) => {
    setEditForm((current) => ({ ...current, [key]: value }))
  }

  const handleSaveModal = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!session || !crudModal) return

    const config = CRUD_CONFIG[crudModal.entity]
    const missingRequired = config.fields
      .filter((field) => field.required)
      .filter((field) => {
        const value = editForm[field.key]
        if (typeof value === 'number') {
          return Number.isNaN(value) || value <= 0
        }
        if (typeof value === 'boolean') {
          return false
        }
        return value === null || value === undefined || String(value).trim() === ''
      })
      .map((field) => field.label)

    if (missingRequired.length) {
      showNotice('error', `Lütfen şu alanları doldurun: ${missingRequired.join(', ')}`)
      return
    }

    const payload = config.toPayload(editForm)

    try {
      setLoading(true)
      if (crudModal.mode === 'create') {
        await createRecord(crudModal.entity, payload as any)
      } else if (crudModal.id) {
        await updateRecord(crudModal.entity, crudModal.id, payload as any)
      }
      setCrudModal(null)
      setEditForm({})
      showNotice('success', crudModal.mode === 'create' ? 'Kayıt oluşturuldu.' : 'Değişiklikler kaydedildi.')
      await loadDashboardData(session.accessToken)
    } catch (error) {
      console.error(error)
      showNotice('error', error instanceof Error ? error.message : 'Kayıt kaydedilemedi.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddDocument = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!session || !detailModal || detailModal.entity === 'blocks' || detailModal.entity === 'expenses') return
    const docEntity = detailModal.entity

    try {
      setDocumentSaving(true)
      await createPropertyDocument({
        entityType: DOCUMENT_ENTITY_TYPES[docEntity],
        entityId: detailModal.id,
        documentCategory: documentForm.documentCategory,
        fileName: documentForm.fileName,
        fileUrl: documentForm.fileUrl,
        notes: documentForm.notes,
      })
      setDocumentForm(DEFAULT_DOCUMENT_FORM)
      showNotice('success', 'Doküman eklendi.')
      await refreshDocuments(docEntity, detailModal.id, session.accessToken)
    } catch (error) {
      console.error(error)
      showNotice('error', error instanceof Error ? error.message : 'Doküman eklenemedi.')
    } finally {
      setDocumentSaving(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!session || !detailModal || detailModal.entity === 'blocks' || detailModal.entity === 'expenses') return
    const docEntity = detailModal.entity

    try {
      await deletePropertyDocument(documentId)
      showNotice('success', 'Doküman silindi.')
      await refreshDocuments(docEntity, detailModal.id, session.accessToken)
    } catch (error) {
      console.error(error)
      showNotice('error', error instanceof Error ? error.message : 'Doküman silinemedi.')
    }
  }

  const deleteRecord = async (collectionName: string, id: string, confirmationMessage: string) => {
    if (!session) return
    if (!window.confirm(confirmationMessage)) return

    try {
      setLoading(true)
      await dbDeleteRecord(collectionName, id)
      showNotice('success', 'Kayıt silindi.')
      await loadDashboardData(session.accessToken)
    } catch (error) {
      console.error(error)
      showNotice('error', error instanceof Error ? error.message : 'Silme işlemi başarısız oldu.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSite = (row: Record<string, unknown>) =>
    void deleteRecord('sites', String(row.id), 'Bu siteyi silmek istediğinize emin misiniz?')

  const handleDeleteBlock = (row: Record<string, unknown>) =>
    void deleteRecord('blocks', String(row.id), 'Bu bloğu silmek istediğinize emin misiniz?')

  const handleDeleteApartment = (row: Record<string, unknown>) =>
    void deleteRecord('apartments', String(row.id), 'Bu daireyi silmek istediğinize emin misiniz?')

  const handleDeleteOwner = (row: Record<string, unknown>) =>
    void deleteRecord('owners', String(row.id), 'Bu sahip kaydını silmek istediğinize emin misiniz?')

  const handleDeleteTenant = (row: Record<string, unknown>) =>
    void deleteRecord('tenants', String(row.id), 'Bu kiracı kaydını silmek istediğinize emin misiniz?')

  const handleDeleteDue = (row: Record<string, unknown>) =>
    void deleteRecord('dues', String(row.id), 'Bu aidatı silmek istediğinize emin misiniz?')

  const handleDeleteAnnouncement = (row: Record<string, unknown>) =>
    void deleteRecord('announcements', String(row.id), 'Bu duyuruyu silmek istediğinize emin misiniz?')

  const handleDeleteTicket = (row: Record<string, unknown>) =>
    void deleteRecord('tickets', String(row.id), 'Bu talebi silmek istediğinize emin misiniz?')

  const handleDeleteExpense = (row: Record<string, unknown>) =>
    void deleteRecord('expenses', String(row.id), 'Bu gider kaydını silmek istediğinize emin misiniz?')

  const openPaymentConfirm = (due: Due, tenant?: Tenant | null) => {
    const associatedTenant =
      tenant ??
      data.tenants.find((t) => t.id === due.tenantId) ??
      data.tenants.find((t) => t.apartmentId === due.apartmentId) ??
      null

    setPaymentConfirmModal({
      due,
      tenant: associatedTenant,
      amount: due.remainingAmount > 0 ? due.remainingAmount : due.amount,
      paymentMethod: 'Banka Havalesi / EFT',
      paymentDate: new Date().toISOString().slice(0, 10),
      notes: '',
    })
  }

  const handleConfirmPayment = async () => {
    if (!paymentConfirmModal || !session) return
    if (paymentConfirmModal.amount <= 0) {
      showNotice('error', 'Lütfen geçerli bir ödeme tutarı girin.')
      return
    }

    setProcessingAction(true)
    try {
      await recordPayment(
        paymentConfirmModal.due.id,
        Number(paymentConfirmModal.amount),
        paymentConfirmModal.paymentMethod,
      )

      await loadDashboardData(session.accessToken)
      const dueTitle = translateDueType(paymentConfirmModal.due.dueType)
      showNotice(
        'success',
        `✅ ${formatCurrency(paymentConfirmModal.amount)} tutarındaki ${dueTitle} ödemesi başarıyla tahsil edildi ve finans kayıtlarına işlendi.`,
      )
      setPaymentConfirmModal(null)
    } catch (error) {
      showNotice('error', error instanceof Error ? error.message : 'Ödeme kaydedilemedi.')
    } finally {
      setProcessingAction(false)
    }
  }

  const openBillModal = (tenant: Tenant) => {
    const nextDueDate = new Date()
    nextDueDate.setDate(15)

    setBillModal({
      tenant,
      period: selectedTenantMonth,
      dueDate: nextDueDate.toISOString().slice(0, 10),
      electricity: 0,
      water: 0,
      gas: 0,
      support: Number(tenant.defaultBillSupport ?? 2000),
      description: `${selectedTenantMonth} Dönemi Faturaları`,
    })
  }

  const handleSaveBill = async () => {
    if (!billModal || !session) return
    const gross = Number(billModal.electricity || 0) + Number(billModal.water || 0) + Number(billModal.gas || 0)
    const net = Math.max(0, gross - Number(billModal.support || 0))

    setProcessingAction(true)
    try {
      await createRecord('dues', {
        apartmentId: billModal.tenant.apartmentId,
        tenantId: billModal.tenant.id,
        dueType: 'FATURA' as any,
        amount: net,
        electricityAmount: Number(billModal.electricity || 0),
        waterAmount: Number(billModal.water || 0),
        gasAmount: Number(billModal.gas || 0),
        billSupportAmount: Number(billModal.support || 0),
        description: billModal.description || `${billModal.period} Elektrik/Su/Gaz Faturası`,
        period: billModal.period,
        dueDate: new Date(billModal.dueDate).toISOString(),
        status: 'PENDING' as any,
      })

      await loadDashboardData(session.accessToken)
      showNotice(
        'success',
        `✅ ${billModal.period} dönemi faturası oluşturuldu. (Brüt: ${formatCurrency(gross)} - Destek: ${formatCurrency(billModal.support)} = Net: ${formatCurrency(net)})`,
      )
      setBillModal(null)
    } catch (error) {
      showNotice('error', error instanceof Error ? error.message : 'Fatura oluşturulamadı.')
    } finally {
      setProcessingAction(false)
    }
  }

  const handleGenerateMonthlyObligations = async (tenant: Tenant, period: string) => {
    if (!session) return
    setProcessingAction(true)

    try {
      const dueDate = new Date()
      dueDate.setDate(15)

      const promises: Promise<unknown>[] = []

      if (tenant.monthlyRent && Number(tenant.monthlyRent) > 0) {
        promises.push(
          createRecord('dues', {
            apartmentId: tenant.apartmentId,
            tenantId: tenant.id,
            dueType: 'KIRA' as any,
            amount: Number(tenant.monthlyRent),
            period,
            dueDate: dueDate.toISOString(),
            description: `${period} Kira Bedeli`,
            status: 'PENDING' as any,
          })
        )
      }

      if (tenant.monthlyDue && Number(tenant.monthlyDue) > 0) {
        promises.push(
          createRecord('dues', {
            apartmentId: tenant.apartmentId,
            tenantId: tenant.id,
            dueType: 'AIDAT' as any,
            amount: Number(tenant.monthlyDue),
            period,
            dueDate: dueDate.toISOString(),
            description: `${period} Aidat Bedeli`,
            status: 'PENDING' as any,
          })
        )
      }

      if (!promises.length) {
        showNotice('error', 'Kiracı için tanımlı kira veya aidat tutarı bulunamadı. Lütfen önce kiracıyı düzenleyip tutar belirleyin.')
        return
      }

      await Promise.all(promises)
      await loadDashboardData(session.accessToken)
      showNotice(
        'success',
        `✅ ${tenant.fullName} için ${period} dönemi Kira ve Aidat tahakkukları başarıyla oluşturuldu.`,
      )
    } catch (error) {
      showNotice('error', error instanceof Error ? error.message : 'Tahakkuk oluşturulurken hata oluştu.')
    } finally {
      setProcessingAction(false)
    }
  }

  const openBulkDueModal = (scope: 'selected' | 'all' | 'site' | 'block' = 'all', siteId?: string, blockId?: string) => {
    const nextDueDate = new Date()
    nextDueDate.setDate(15)
    if (nextDueDate < new Date()) {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1)
    }

    const currentPeriod = new Date().toISOString().slice(0, 7)
    let initialApartmentIds: string[] = []

    if (scope === 'selected') {
      initialApartmentIds = Array.from(selectedApartmentIds)
    } else if (scope === 'block' && blockId && blockId !== 'all') {
      initialApartmentIds = data.apartments.filter((a) => a.blockId === blockId && a.isActive).map((a) => a.id)
    } else if (scope === 'site' && siteId && siteId !== 'all') {
      const siteBlockIds = new Set(data.blocks.filter((b) => b.siteId === siteId).map((b) => b.id))
      initialApartmentIds = data.apartments.filter((a) => siteBlockIds.has(a.blockId) && a.isActive).map((a) => a.id)
    } else {
      initialApartmentIds = data.apartments.filter((a) => a.isActive).map((a) => a.id)
    }

    setBulkDueModal({
      scope,
      siteId: siteId || 'all',
      blockId: blockId || 'all',
      apartmentIds: initialApartmentIds,
      period: currentPeriod,
      dueDate: nextDueDate.toISOString().slice(0, 10),
      dueType: 'AIDAT',
      amountMode: 'FIXED',
      fixedAmount: 2500,
      electricityAmount: 0,
      waterAmount: 0,
      gasAmount: 0,
      billSupportAmount: 0,
      description: '',
      skipDuplicates: true,
    })
  }

  const handleExecuteBulkDues = async () => {
    if (!bulkDueModal || !session) return
    if (!bulkDueModal.apartmentIds.length) {
      showNotice('error', 'Lütfen tahakkuk oluşturulacak en az bir daire seçin.')
      return
    }

    setProcessingAction(true)
    try {
      const res = await bulkCreateDues({
        scope: bulkDueModal.scope,
        siteId: bulkDueModal.siteId,
        blockId: bulkDueModal.blockId,
        apartmentIds: bulkDueModal.apartmentIds,
        period: bulkDueModal.period,
        dueDate: new Date(bulkDueModal.dueDate).toISOString(),
        dueType: bulkDueModal.dueType,
        amountMode: bulkDueModal.amountMode,
        fixedAmount: Number(bulkDueModal.fixedAmount || 0),
        electricityAmount: bulkDueModal.dueType === 'FATURA' ? Number(bulkDueModal.electricityAmount || 0) : undefined,
        waterAmount: bulkDueModal.dueType === 'FATURA' ? Number(bulkDueModal.waterAmount || 0) : undefined,
        gasAmount: bulkDueModal.dueType === 'FATURA' ? Number(bulkDueModal.gasAmount || 0) : undefined,
        billSupportAmount: bulkDueModal.dueType === 'FATURA' ? Number(bulkDueModal.billSupportAmount || 0) : undefined,
        description: bulkDueModal.description || `${bulkDueModal.period} Toplu ${translateDueType(bulkDueModal.dueType)}`,
        skipDuplicates: bulkDueModal.skipDuplicates,
      })

      await loadDashboardData(session.accessToken)
      setSelectedApartmentIds(new Set())
      showNotice(
        'success',
        `✅ Toplu Tahakkuk Tamamlandı: ${res.createdCount} yeni tahakkuk oluşturuldu${res.skippedCount > 0 ? `, ${res.skippedCount} mükerrer kayıt atlandı` : ''}.`,
      )
      setBulkDueModal(null)
    } catch (error) {
      showNotice('error', error instanceof Error ? error.message : 'Toplu tahakkuk işlemi başarısız.')
    } finally {
      setProcessingAction(false)
    }
  }

  const openBulkImportModal = () => {
    setBulkImportModal({
      rawCsvText: '',
      parsedRows: [],
      logs: [],
      completed: false,
    })
  }

  const handleCsvTextChange = (text: string) => {
    const parsed = parseDuesCsv(text)
    setBulkImportModal((prev) => (prev ? { ...prev, rawCsvText: text, parsedRows: parsed } : null))
  }

  const handleExecuteBulkImport = async () => {
    if (!bulkImportModal || !session) return
    if (!bulkImportModal.parsedRows.length) {
      showNotice('error', 'İçe aktarılacak geçerli satır bulunamadı.')
      return
    }

    setProcessingAction(true)
    try {
      let successCount = 0
      for (const row of bulkImportModal.parsedRows) {
        const apt = data.apartments.find((a) => a.apartmentNumber.includes(row.apartmentNumber) || row.apartmentNumber.includes(a.apartmentNumber))
        const tenant = apt ? data.tenants.find((t) => t.apartmentId === apt.id && t.isActive) : null

        if (apt) {
          await createRecord('dues', {
            apartmentId: apt.id,
            tenantId: tenant?.id || null,
            dueType: row.dueType as any,
            amount: Number(row.amount || 0),
            period: row.period,
            dueDate: new Date(row.dueDate).toISOString(),
            status: 'PENDING' as any,
            electricityAmount: row.electricityAmount || null,
            waterAmount: row.waterAmount || null,
            gasAmount: row.gasAmount || null,
            billSupportAmount: row.billSupportAmount || null,
            grossAmount: Number(row.amount || 0),
            description: row.description || `${row.period} İçe Aktarılan Tahakkuk`,
          })
          successCount++
        }
      }

      await loadDashboardData(session.accessToken)
      showNotice(
        'success',
        `✅ İçe Aktarma Başarılı: ${successCount} kayıt eklendi.`,
      )
      setBulkImportModal(null)
    } catch (error) {
      showNotice('error', error instanceof Error ? error.message : 'İçe aktarma sırasında hata oluştu.')
    } finally {
      setProcessingAction(false)
    }
  }

  const handleDownloadImportTemplate = () => {
    const headers = ['SiteAdı', 'BlokAdı', 'DaireNo', 'Dönem', 'Tür', 'Tutar', 'Elektrik', 'Su', 'Doğalgaz', 'Destek', 'VadeTarihi', 'Açıklama']
    const sampleRows = [
      ['Güneş Sitesi', 'A Blok', '1', '2026-04', 'AIDAT', '2500', '', '', '', '', '2026-04-15', 'Nisan Aidatı'],
      ['Güneş Sitesi', 'A Blok', '2', '2026-04', 'FATURA', '', '650', '300', '450', '500', '2026-04-15', 'Nisan Sayaç Faturası'],
    ]
    downloadCsvFile('tahakkuk_ve_sayac_sablonu.csv', headers, sampleRows)
  }

  const handleExportApartmentsCsv = () => {
    const headers = ['Site', 'Blok', 'Daire No', 'Kat', 'Tip', 'Tapu No', 'Durum']
    const rows = data.apartments.map((a) => {
      const block = data.blocks.find((b) => b.id === a.blockId)
      const site = block ? data.sites.find((s) => s.id === block.siteId) : null
      return [site?.name ?? '—', block?.name ?? '—', a.apartmentNumber, a.floor, a.apartmentType, a.tapuNumber, a.isActive ? 'Aktif' : 'Pasif']
    })
    downloadCsvFile(`daire_listesi_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  const handleExportDuesCsv = () => {
    const headers = ['Site / Blok / Daire', 'Tür', 'Dönem', 'Vade Tarihi', 'Tutar', 'Ödenen', 'Kalan', 'Durum', 'Açıklama']
    const rows = data.dues.map((d) => {
      const apt = data.apartments.find((a) => a.id === d.apartmentId)
      const aptLabel = apt ? getApartmentDisplayLabel(apt, data) : d.apartmentId
      return [
        aptLabel,
        translateDueType(d.dueType),
        d.period,
        d.dueDate ? formatDate(d.dueDate) : '—',
        d.amount,
        d.totalPaid,
        d.remainingAmount,
        translateStatus(d.status),
        d.description ?? '',
      ]
    })
    downloadCsvFile(`tahakkuk_listesi_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
  }

  const filteredSites = useMemo(() => {
    const state = filters.sites
    const rows = data.sites.filter((item) => {
      const text = normalizeText([item.name, item.address, item.phone, item.email].join(' '))
      return !state.search || text.includes(normalizeText(state.search))
    })

    return [...rows].sort((left, right) => {
      const factor = state.sortDirection === 'desc' ? -1 : 1
      if (state.sortBy === 'createdAt') {
        return factor * compareText(left.createdAt, right.createdAt)
      }
      return factor * compareText(left.name, right.name)
    })
  }, [data.sites, filters.sites])

  const filteredBlocks = useMemo(() => {
    const state = filters.blocks
    const rows = data.blocks.filter((item) => {
      const text = normalizeText([item.name, getSiteNameFromBlockId(item.id)].join(' '))
      const matchesSearch = !state.search || text.includes(normalizeText(state.search))
      const matchesSite = state.status === 'all' || item.siteId === state.status
      return matchesSearch && matchesSite
    })

    return [...rows].sort((left, right) => {
      const factor = state.sortDirection === 'desc' ? -1 : 1
      switch (state.sortBy) {
        case 'createdAt':
          return factor * compareText(left.createdAt, right.createdAt)
        default:
          return factor * compareText(left.name, right.name)
      }
    })
  }, [data.blocks, filters.blocks, blocksById, sitesById])

  const filteredApartments = useMemo(() => {
    const state = filters.apartments
    const rows = data.apartments.filter((item) => {
      const text = normalizeText([
        item.apartmentNumber,
        item.apartmentType,
        item.tapuNumber,
        getBlockName(item.blockId),
        getSiteNameFromBlockId(item.blockId),
      ].join(' '))

      const matchesSearch = !state.search || text.includes(normalizeText(state.search))
      const matchesActivity =
        state.activity === 'all' ||
        (state.activity === 'active' && item.isActive) ||
        (state.activity === 'inactive' && !item.isActive)

      return matchesSearch && matchesActivity
    })

    return [...rows].sort((left, right) => {
      const factor = state.sortDirection === 'desc' ? -1 : 1
      switch (state.sortBy) {
        case 'apartmentNumber':
          return factor * compareText(left.apartmentNumber, right.apartmentNumber)
        case 'createdAt':
          return factor * compareText(left.createdAt, right.createdAt)
        default:
          return factor * compareNumber(left.floor, right.floor)
      }
    })
  }, [data.apartments, filters.apartments, blocksById, sitesById])

  const filteredOwners = useMemo(() => {
    const state = filters.owners
    const rows = data.owners.filter((item) => {
      const text = normalizeText([
        item.fullName,
        item.phone,
        item.email,
        item.idNumber,
        getApartmentLabel(item.apartmentId),
        getSiteNameFromApartmentId(item.apartmentId),
      ].join(' '))
      const matchesSearch = !state.search || text.includes(normalizeText(state.search))
      const matchesActivity =
        state.activity === 'all' ||
        (state.activity === 'active' && item.isActive) ||
        (state.activity === 'inactive' && !item.isActive)

      return matchesSearch && matchesActivity
    })

    return [...rows].sort((left, right) => {
      const factor = state.sortDirection === 'desc' ? -1 : 1
      switch (state.sortBy) {
        case 'apartmentId':
          return factor * compareText(getApartmentLabel(left.apartmentId), getApartmentLabel(right.apartmentId))
        case 'createdAt':
          return factor * compareText(left.createdAt, right.createdAt)
        default:
          return factor * compareText(left.fullName, right.fullName)
      }
    })
  }, [data.owners, filters.owners, apartmentsById, blocksById, sitesById])

  const filteredTenants = useMemo(() => {
    const state = filters.tenants
    const rows = data.tenants.filter((item) => {
      const text = normalizeText([
        item.fullName,
        item.phone,
        item.email,
        item.idNumber,
        getApartmentLabel(item.apartmentId),
        getSiteNameFromApartmentId(item.apartmentId),
      ].join(' '))
      const matchesSearch = !state.search || text.includes(normalizeText(state.search))
      const matchesActivity =
        state.activity === 'all' ||
        (state.activity === 'active' && item.isActive) ||
        (state.activity === 'inactive' && !item.isActive)

      return matchesSearch && matchesActivity
    })

    return [...rows].sort((left, right) => {
      const factor = state.sortDirection === 'desc' ? -1 : 1
      switch (state.sortBy) {
        case 'moveInDate':
          return factor * compareText(left.moveInDate ?? '', right.moveInDate ?? '')
        case 'createdAt':
          return factor * compareText(left.createdAt, right.createdAt)
        default:
          return factor * compareText(left.fullName, right.fullName)
      }
    })
  }, [data.tenants, filters.tenants, apartmentsById, blocksById, sitesById])

  const filteredDues = useMemo(() => {
    const state = filters.dues
    const rows = data.dues.filter((item) => {
      const apartment = apartmentsById.get(item.apartmentId)
      const siteId = apartment ? blocksById.get(apartment.blockId)?.siteId ?? '' : ''
      const text = normalizeText([
        item.period,
        getApartmentLabel(item.apartmentId),
        getSiteNameFromApartmentId(item.apartmentId),
      ].join(' '))
      const matchesSearch = !state.search || text.includes(normalizeText(state.search))
      const matchesStatus = state.status === 'all' || String(item.status ?? '').toUpperCase() === state.status
      const matchesActivity =
        state.activity === 'all' ||
        (state.activity === 'overdue' && item.isOverdue) ||
        (state.activity === 'current' && !item.isOverdue)
      const matchesSite = state.siteId === 'all' || siteId === state.siteId
      const matchesMonth = state.month === 'all' || item.period === state.month
      const matchesDueType = !state.dueType || state.dueType === 'all' || String(item.dueType ?? '').toUpperCase() === state.dueType

      return matchesSearch && matchesStatus && matchesActivity && matchesSite && matchesMonth && matchesDueType
    })

    return [...rows].sort((left, right) => {
      const factor = state.sortDirection === 'desc' ? -1 : 1
      switch (state.sortBy) {
        case 'amount':
          return factor * compareNumber(left.amount, right.amount)
        case 'remainingAmount':
          return factor * compareNumber(left.remainingAmount, right.remainingAmount)
        case 'period':
          return factor * compareText(left.period, right.period)
        default:
          return factor * compareText(left.dueDate, right.dueDate)
      }
    })
  }, [data.dues, filters.dues, apartmentsById, blocksById, sitesById])

  const filteredAnnouncements = useMemo(() => {
    const state = filters.announcements
    const rows = data.announcements.filter((item) => {
      const creator = data.users.find((user) => user.id === item.createdBy)
      const text = normalizeText([item.title, item.content, creator?.fullName ?? '', creator?.email ?? ''].join(' '))
      return !state.search || text.includes(normalizeText(state.search))
    })

    return [...rows].sort((left, right) => {
      const factor = state.sortDirection === 'desc' ? -1 : 1
      switch (state.sortBy) {
        case 'createdAt':
          return factor * compareText(left.createdAt, right.createdAt)
        default:
          return factor * compareText(left.title, right.title)
      }
    })
  }, [data.announcements, data.users, filters.announcements])

  const filteredTickets = useMemo(() => {
    const state = filters.tickets
    const rows = data.tickets.filter((item) => {
      const text = normalizeText([item.title, item.description, item.priority, item.status].join(' '))
      const matchesSearch = !state.search || text.includes(normalizeText(state.search))
      const matchesStatus = state.status === 'all' || String(item.status ?? '').toUpperCase() === state.status
      const matchesActivity =
        state.activity === 'all' ||
        (state.activity === 'active' && String(item.status ?? '').toUpperCase() !== 'RESOLVED') ||
        (state.activity === 'inactive' && String(item.status ?? '').toUpperCase() === 'RESOLVED')

      return matchesSearch && matchesStatus && matchesActivity
    })

    return [...rows].sort((left, right) => {
      const factor = state.sortDirection === 'desc' ? -1 : 1
      switch (state.sortBy) {
        case 'createdAt':
          return factor * compareText(left.createdAt, right.createdAt)
        default:
          return factor * compareText(left.title, right.title)
      }
    })
  }, [data.tickets, filters.tickets])

  const filteredExpenses = useMemo(() => {
    const state = filters.expenses
    const rows = data.expenses.filter((item) => {
      const text = normalizeText([item.title, item.category, item.invoiceUrl].join(' '))
      const matchesSearch = !state.search || text.includes(normalizeText(state.search))
      const matchesMonth =
        financeMonthFilter === 'all' ||
        (item.expenseDate && String(item.expenseDate).startsWith(financeMonthFilter))
      return matchesSearch && matchesMonth
    })

    return [...rows].sort((left, right) => {
      const factor = state.sortDirection === 'desc' ? -1 : 1
      switch (state.sortBy) {
        case 'amount':
          return factor * (Number(left.amount) - Number(right.amount))
        case 'expenseDate':
          return factor * compareText(left.expenseDate, right.expenseDate)
        default:
          return factor * compareText(left.title, right.title)
      }
    })
  }, [data.expenses, filters.expenses, financeMonthFilter])

  const detailRecord = useMemo(() => {
    if (!detailModal) return null

    const collections: Record<CrudEntity, Array<Record<string, unknown>>> = {
      sites: data.sites,
      blocks: data.blocks,
      apartments: data.apartments,
      owners: data.owners,
      tenants: data.tenants,
      dues: data.dues,
      expenses: data.expenses,
    }

    return collections[detailModal.entity].find((item) => String(item.id) === detailModal.id) ?? null
  }, [detailModal, data])

  const detailBreadcrumb = useMemo(
    () => getDetailBreadcrumb(detailModal, detailRecord, data),
    [detailModal, detailRecord, data],
  )

  const renderFilterToolbar = (
    section: FilterSection,
    config: {
      searchPlaceholder: string
      sortOptions: { value: string; label: string }[]
      statusOptions?: { value: string; label: string }[]
      activityOptions?: { value: string; label: string }[]
      extraFields?: React.ReactNode
    },
  ) => (
    <>
      <label className="toolbar-field">
        <span>Arama</span>
        <input
          type="text"
          value={filters[section].search}
          placeholder={config.searchPlaceholder}
          onChange={(event) => updateFilter(section, { search: event.target.value })}
        />
      </label>
      <label className="toolbar-field">
        <span>Sıralama</span>
        <select value={filters[section].sortBy} onChange={(event) => updateFilter(section, { sortBy: event.target.value })}>
          {config.sortOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="toolbar-field">
        <span>Yön</span>
        <select value={filters[section].sortDirection} onChange={(event) => updateFilter(section, { sortDirection: event.target.value as 'asc' | 'desc' })}>
          <option value="asc">Artan</option>
          <option value="desc">Azalan</option>
        </select>
      </label>
      {config.statusOptions ? (
        <label className="toolbar-field">
          <span>Durum</span>
          <select value={filters[section].status} onChange={(event) => updateFilter(section, { status: event.target.value })}>
            {config.statusOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {config.activityOptions ? (
        <label className="toolbar-field">
          <span>Görünüm</span>
          <select value={filters[section].activity} onChange={(event) => updateFilter(section, { activity: event.target.value })}>
            {config.activityOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {config.extraFields}
    </>
  )

  const renderOverview = () => {
    const totalIncome = data.payments.reduce((sum, item) => sum + Number(item.amountPaid ?? 0), 0)
    const totalExpenses = data.expenses.reduce((sum, item) => sum + Number(item.amount ?? 0), 0)
    const netKasa = totalIncome - totalExpenses
    const pendingDues = data.dues.filter((due) => String(due.status ?? '').toUpperCase() !== 'PAID').length
    const openTickets = data.tickets.filter((ticket) => String(ticket.status ?? '').toUpperCase() !== 'RESOLVED').length
    const totalDuesAmount = data.dues.reduce((sum, item) => sum + Number(item.amount ?? 0), 0)
    const collectionRate = totalDuesAmount > 0 ? Math.min(100, Math.round((totalIncome / totalDuesAmount) * 100)) : 100

    return (
      <div style={{ display: 'grid', gap: '24px' }}>
        {/* 1. Quick Actions Bar */}
        <div style={{ background: 'var(--color-pure-white)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--radius-cards)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', boxShadow: 'var(--shadow-card)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-ink-charcoal)' }}>Hızlı İşlemler</h3>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-slate-gray)' }}>Yeni kayıt oluşturun veya tahakkuk başlatın</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn-quick-action" onClick={() => openCreateModal('sites')}>
              + Site Ekle
            </button>
            <button type="button" className="btn-quick-action" onClick={() => openCreateModal('apartments')}>
              + Daire Ekle
            </button>
            <button type="button" className="btn-quick-action" onClick={() => openCreateModal('tenants')}>
              + Kiracı Ekle
            </button>
            <button type="button" className="btn-quick-action primary" onClick={() => openCreateModal('dues')}>
              + Tahakkuk Oluştur
            </button>
            <button type="button" className="btn-quick-action" onClick={() => openCreateModal('expenses')}>
              + Gider Kaydı
            </button>
          </div>
        </div>

        {/* 2. 6-Card Rich Metrics Grid */}
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div className="metric-card blue">
            <span>Aktif Siteler</span>
            <strong>{data.sites.length}</strong>
            <small style={{ fontSize: '12px', color: 'var(--color-slate-gray)' }}>Toplam {data.blocks.length} blok</small>
          </div>
          <div className="metric-card green">
            <span>Toplam Daire</span>
            <strong>{data.apartments.length}</strong>
            <small style={{ fontSize: '12px', color: 'var(--color-slate-gray)' }}>{data.tenants.filter((t) => t.isActive).length} aktif kiracı</small>
          </div>
          <div className="metric-card violet">
            <span>Kayıtlı Sakinler</span>
            <strong>{data.owners.length + data.tenants.length}</strong>
            <small style={{ fontSize: '12px', color: 'var(--color-slate-gray)' }}>{data.owners.length} sahip, {data.tenants.length} kiracı</small>
          </div>
          <div className="metric-card">
            <span style={{ color: 'var(--color-forest)' }}>Net Kasa Bakiyesi</span>
            <strong style={{ color: netKasa >= 0 ? 'var(--color-forest)' : '#cf1322' }}>{formatCurrency(netKasa)}</strong>
            <small style={{ fontSize: '12px', color: 'var(--color-slate-gray)' }}>Tahsilat - Giderler</small>
          </div>
          <div className="metric-card orange">
            <span>Bekleyen Tahakkuk</span>
            <strong style={{ color: 'var(--orange)' }}>{pendingDues}</strong>
            <small style={{ fontSize: '12px', color: 'var(--color-slate-gray)' }}>Ödeme bekleyen kalem</small>
          </div>
          <div className="metric-card">
            <span>Açık Destek Talepleri</span>
            <strong style={{ color: 'var(--color-electric-cobalt)' }}>{openTickets}</strong>
            <small style={{ fontSize: '12px', color: 'var(--color-slate-gray)' }}>İşlem bekleyen talep</small>
          </div>
        </div>

        {/* 3. 2-Column Dashboard Panels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          {/* Sol Kolon: Finansal Özet + Duyurular */}
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Finansal Canlı Durum Kartı */}
            <div className="panel">
              <div className="panel-header">
                <h3>Kasa ve Tahsilat Özeti</h3>
                <button
                  type="button"
                  className="ghost-button small"
                  onClick={() => setActiveTab('finance')}
                >
                  Finans Paneline Git
                </button>
              </div>
              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-slate-gray)' }}>Genel Tahsilat Başarısı:</span>
                  <strong style={{ fontSize: '15px', color: 'var(--color-forest)' }}>%{collectionRate}</strong>
                </div>
                <div className="finance-progress-bar" style={{ margin: '2px 0 12px' }}>
                  <div className="finance-progress-fill green" style={{ width: `${collectionRate}%` }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: 'var(--color-surface-ivory)', padding: '14px', borderRadius: 'var(--radius-cards)', border: '1px solid var(--color-hairline)', textAlign: 'center' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-slate-gray)', display: 'block' }}>Toplam Tahsilat</span>
                    <strong style={{ color: 'var(--color-forest)', fontSize: '14px' }}>+{formatCurrency(totalIncome)}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-slate-gray)', display: 'block' }}>Toplam Gider</span>
                    <strong style={{ color: '#cf1322', fontSize: '14px' }}>-{formatCurrency(totalExpenses)}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-slate-gray)', display: 'block' }}>Net Kasa</span>
                    <strong style={{ color: netKasa >= 0 ? 'var(--color-forest)' : '#cf1322', fontSize: '14px' }}>{formatCurrency(netKasa)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Son Duyurular */}
            <div className="panel">
              <div className="panel-header">
                <h3>En Son Duyurular</h3>
                <button
                  type="button"
                  className="ghost-button small"
                  onClick={() => setActiveTab('announcements')}
                >
                  Tümü ({data.announcements.length})
                </button>
              </div>
              <div className="list-stack">
                {data.announcements.slice(0, 3).map((item) => (
                  <div className="list-item" key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: '14px', display: 'block', fontWeight: 600 }}>{item.title}</strong>
                      <p style={{ fontSize: '13px', color: 'var(--color-slate-gray)', margin: '2px 0 0' }}>{item.content}</p>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-steel-gray)', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                ))}
                {data.announcements.length === 0 && (
                  <p style={{ margin: 0, padding: '12px 0', color: 'var(--color-slate-gray)', fontSize: '13px', textAlign: 'center' }}>
                    Henüz yayınlanmış bir duyuru bulunmuyor.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sağ Kolon: Açık Talepler + Denetim Kayıtları */}
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* Açık Destek Talepleri */}
            <div className="panel">
              <div className="panel-header">
                <h3>Açık Destek Talepleri</h3>
                <button
                  type="button"
                  className="ghost-button small"
                  onClick={() => setActiveTab('tickets')}
                >
                  Tümü ({data.tickets.length})
                </button>
              </div>
              <div className="list-stack">
                {data.tickets.slice(0, 3).map((item) => (
                  <div className="list-item" key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '14px', display: 'block', fontWeight: 600 }}>{item.title}</strong>
                      <p style={{ fontSize: '13px', color: 'var(--color-slate-gray)', margin: '2px 0 0' }}>{item.description}</p>
                    </div>
                    <div className="inline-actions">
                      <StatusPill value={item.status} />
                    </div>
                  </div>
                ))}
                {data.tickets.length === 0 && (
                  <p style={{ margin: 0, padding: '12px 0', color: 'var(--color-slate-gray)', fontSize: '13px', textAlign: 'center' }}>
                    Açık veya bekleyen bir talep bulunmuyor.
                  </p>
                )}
              </div>
            </div>

            {/* Son Denetim Kayıtları (Audit Logs) */}
            <div className="panel">
              <div className="panel-header">
                <h3>Son Sistem Hareketleri</h3>
                <button
                  type="button"
                  className="ghost-button small"
                  onClick={() => setActiveTab('audit')}
                >
                  Denetim Kütüğü
                </button>
              </div>
              <div className="list-stack">
                {data.auditLogs.slice(0, 3).map((log) => (
                  <div className="list-item" key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="type-badge type-aidat" style={{ fontSize: '11px', padding: '2px 8px', marginRight: '8px' }}>
                        {log.action}
                      </span>
                      <strong style={{ fontSize: '13px', display: 'inline', fontWeight: 500 }}>{log.details || log.entityName}</strong>
                    </div>
                    <small style={{ fontSize: '12px', color: 'var(--color-steel-gray)' }}>{formatDate(log.timestamp)}</small>
                  </div>
                ))}
                {data.auditLogs.length === 0 && (
                  <p style={{ margin: 0, padding: '12px 0', color: 'var(--color-slate-gray)', fontSize: '13px', textAlign: 'center' }}>
                    Kayıtlı işlem geçmişi bulunamadı.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderLoadingState = () => (
    <div className="loading-stack">
      <div className="loading-panel shimmer-block" />
      <div className="metrics-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="metric-card shimmer-card" key={index} />
        ))}
      </div>
      <div className="stack-grid">
        <div className="panel shimmer-panel" />
        <div className="panel shimmer-panel" />
      </div>
    </div>
  )

  const renderDetailTrail = () => {
    if (!detailBreadcrumb.length) return null

    return (
      <div className="breadcrumb-bar">
        {detailBreadcrumb.map((item, index) => (
          <span key={`${item}-${index}`} className={index % 2 === 0 ? 'breadcrumb-node' : 'breadcrumb-value'}>
            {item}
            {index < detailBreadcrumb.length - 1 ? <span className="breadcrumb-separator">/</span> : null}
          </span>
        ))}
      </div>
    )
  }

  const renderSites = () => (
    <ResourceTable
      title="Siteler"
      rows={filteredSites}
      createLabel="Yeni site"
      onCreate={() => openCreateModal('sites')}
      onEdit={(row) => openEditModal('sites', row)}
      onView={(row) => void openDetailModal('sites', row)}
      onDelete={handleDeleteSite}
      toolbar={renderFilterToolbar('sites', {
        searchPlaceholder: 'Site adı, adres, telefon veya e-posta ara',
        sortOptions: [
          { value: 'name', label: 'Ada göre' },
          { value: 'createdAt', label: 'Oluşturulma tarihine göre' },
        ],
      })}
      columns={[
        { key: 'name', label: 'Ad' },
        { key: 'address', label: 'Adres' },
        { key: 'phone', label: 'Telefon' },
        { key: 'email', label: 'E-posta' },
      ]}
    />
  )

  const renderBlocks = () => (
    <ResourceTable
      title="Bloklar"
      rows={filteredBlocks}
      createLabel="Yeni blok"
      onCreate={() => openCreateModal('blocks', filters.blocks.status !== 'all' ? { siteId: filters.blocks.status } : undefined)}
      onEdit={(row) => openEditModal('blocks', row)}
      onView={(row) => void openDetailModal('blocks', row)}
      onDelete={handleDeleteBlock}
      emptyMessage="Bu filtreye uygun blok bulunamadı."
      toolbar={renderFilterToolbar('blocks', {
        searchPlaceholder: 'Blok adı veya site ara',
        sortOptions: [
          { value: 'name', label: 'Ada göre' },
          { value: 'createdAt', label: 'Oluşturulma tarihine göre' },
        ],
        extraFields: (
          <label className="toolbar-field">
            <span>Site</span>
            <select value={filters.blocks.status} onChange={(event) => updateFilter('blocks', { status: event.target.value })}>
              <option value="all">Tümü</option>
              {data.sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </label>
        ),
      })}
      columns={[
        { key: 'name', label: 'Blok adı' },
        { key: 'siteId', label: 'Site', render: (row) => sitesById.get(String(row.siteId))?.name ?? String(row.siteId) },
        { key: 'createdAt', label: 'Oluşturulma', render: (row) => formatDate(String(row.createdAt)) },
      ]}
    />
  )

  const renderApartments = () => (
    <ResourceTable
      title="Daireler"
      rows={filteredApartments}
      createLabel="Yeni daire"
      onCreate={() => openCreateModal('apartments')}
      onEdit={(row) => openEditModal('apartments', row)}
      onView={(row) => void openDetailModal('apartments', row)}
      onDelete={handleDeleteApartment}
      selectable={true}
      selectedIds={selectedApartmentIds}
      onToggleSelect={(id) => {
        setSelectedApartmentIds((prev) => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
      }}
      onToggleSelectAll={() => {
        const filteredIds = filteredApartments.map((a) => a.id)
        const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedApartmentIds.has(id))
        setSelectedApartmentIds(allSelected ? new Set() : new Set(filteredIds))
      }}
      headerActions={
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-quick-action primary"
            onClick={() => openBulkDueModal('all')}
          >
            ⚡ Toplu Tahakkuk
          </button>
          <button
            type="button"
            className="btn-quick-action"
            onClick={() => openBulkImportModal()}
          >
            📥 Excel / CSV İçe Aktar
          </button>
          <button
            type="button"
            className="btn-quick-action"
            onClick={() => handleExportApartmentsCsv()}
          >
            📤 CSV İndir
          </button>
        </div>
      }
      toolbar={renderFilterToolbar('apartments', {
        searchPlaceholder: 'Daire no, tapu no, blok veya site ara',
        sortOptions: [
          { value: 'floor', label: 'Kata göre' },
          { value: 'apartmentNumber', label: 'Daire numarasına göre' },
          { value: 'createdAt', label: 'Oluşturulma tarihine göre' },
        ],
        activityOptions: [
          { value: 'all', label: 'Tümü' },
          { value: 'active', label: 'Sadece aktif' },
          { value: 'inactive', label: 'Sadece pasif' },
        ],
      })}
      columns={[
        { key: 'apartmentNumber', label: 'Numara' },
        { key: 'blockId', label: 'Blok', render: (row) => getBlockName(String(row.blockId)) },
        { key: 'floor', label: 'Kat' },
        { key: 'apartmentType', label: 'Tip' },
        { key: 'isActive', label: 'Durum', render: (row) => <StatusPill value={row.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
      ]}
    />
  )

  const renderOwners = () => (
    <ResourceTable
      title="Sahipler"
      rows={filteredOwners}
      createLabel="Yeni sahip"
      onCreate={() => openCreateModal('owners')}
      onEdit={(row) => openEditModal('owners', row)}
      onView={(row) => void openDetailModal('owners', row)}
      onDelete={handleDeleteOwner}
      toolbar={renderFilterToolbar('owners', {
        searchPlaceholder: 'Ad, telefon, kimlik, daire veya site ara',
        sortOptions: [
          { value: 'fullName', label: 'Ada göre' },
          { value: 'apartmentId', label: 'Daireye göre' },
          { value: 'createdAt', label: 'Oluşturulma tarihine göre' },
        ],
        activityOptions: [
          { value: 'all', label: 'Tümü' },
          { value: 'active', label: 'Sadece aktif' },
          { value: 'inactive', label: 'Sadece pasif' },
        ],
      })}
      columns={[
        { key: 'fullName', label: 'Sahip' },
        { key: 'apartmentId', label: 'Daire', render: (row) => getApartmentLabel(String(row.apartmentId)) },
        { key: 'phone', label: 'Telefon' },
        { key: 'email', label: 'E-posta' },
        { key: 'isActive', label: 'Durum', render: (row) => <StatusPill value={row.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
      ]}
    />
  )

  const renderTenants = () => (
    <ResourceTable
      title="Kiracılar"
      rows={filteredTenants}
      createLabel="Yeni kiracı"
      onCreate={() => openCreateModal('tenants')}
      onEdit={(row) => openEditModal('tenants', row)}
      onView={(row) => void openDetailModal('tenants', row)}
      onDelete={handleDeleteTenant}
      toolbar={renderFilterToolbar('tenants', {
        searchPlaceholder: 'Ad, telefon, kimlik, daire veya site ara',
        sortOptions: [
          { value: 'fullName', label: 'Ada göre' },
          { value: 'moveInDate', label: 'Giriş tarihine göre' },
          { value: 'createdAt', label: 'Oluşturulma tarihine göre' },
        ],
        activityOptions: [
          { value: 'all', label: 'Tümü' },
          { value: 'active', label: 'Sadece aktif' },
          { value: 'inactive', label: 'Sadece pasif' },
        ],
      })}
      columns={[
        { key: 'fullName', label: 'Kiracı' },
        { key: 'apartmentId', label: 'Daire', render: (row) => getApartmentLabel(String(row.apartmentId)) },
        { key: 'phone', label: 'Telefon' },
        { key: 'moveInDate', label: 'Giriş', render: (row) => formatDate(String(row.moveInDate ?? '')) },
        { key: 'isActive', label: 'Durum', render: (row) => <StatusPill value={row.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
      ]}
    />
  )

  const renderFinance = () => {
    const distinctMonths = [...new Set(data.dues.map((due) => due.period).filter(Boolean))].sort((a, b) =>
      b.localeCompare(a),
    )

    const scopedDues =
      financeMonthFilter === 'all' ? data.dues : data.dues.filter((d) => d.period === financeMonthFilter)

    const scopedPayments =
      financeMonthFilter === 'all'
        ? data.payments
        : data.payments.filter((p) => {
            const due = data.dues.find((d) => d.id === p.dueId)
            return due
              ? due.period === financeMonthFilter
              : p.paymentDate && p.paymentDate.startsWith(financeMonthFilter)
          })

    const scopedExpenses =
      financeMonthFilter === 'all'
        ? data.expenses
        : data.expenses.filter((e) => e.expenseDate && e.expenseDate.startsWith(financeMonthFilter))

    const totalDuesExpected = scopedDues.reduce((s, d) => s + Number(d.amount), 0)
    const totalCollected = scopedPayments.reduce((s, p) => s + Number(p.amountPaid ?? 0), 0)
    const totalExpenses = scopedExpenses.reduce((s, e) => s + Number(e.amount ?? 0), 0)
    const netKasaBalance = totalCollected - totalExpenses
    const collectionRate =
      totalDuesExpected > 0 ? Math.min(100, Math.round((totalCollected / totalDuesExpected) * 100)) : 100

    const kiraDues = scopedDues.filter((d) => d.dueType === 'KIRA')
    const kiraTotal = kiraDues.reduce((s, d) => s + Number(d.amount), 0)
    const kiraPaid = kiraDues.reduce((s, d) => s + Number(d.totalPaid ?? 0), 0)
    const kiraRemaining = kiraDues.reduce((s, d) => s + Number(d.remainingAmount ?? 0), 0)
    const kiraRate = kiraTotal > 0 ? Math.min(100, Math.round((kiraPaid / kiraTotal) * 100)) : 100

    const aidatDues = scopedDues.filter((d) => d.dueType === 'AIDAT')
    const aidatTotal = aidatDues.reduce((s, d) => s + Number(d.amount), 0)
    const aidatPaid = aidatDues.reduce((s, d) => s + Number(d.totalPaid ?? 0), 0)
    const aidatRemaining = aidatDues.reduce((s, d) => s + Number(d.remainingAmount ?? 0), 0)
    const aidatRate = aidatTotal > 0 ? Math.min(100, Math.round((aidatPaid / aidatTotal) * 100)) : 100

    const faturaDues = scopedDues.filter((d) => d.dueType === 'FATURA')
    const faturaSupport = faturaDues.reduce((s, d) => s + Number(d.billSupportAmount ?? 0), 0)
    const faturaNet = faturaDues.reduce((s, d) => s + Number(d.amount), 0)
    const faturaPaid = faturaDues.reduce((s, d) => s + Number(d.totalPaid ?? 0), 0)
    const faturaRemaining = faturaDues.reduce((s, d) => s + Number(d.remainingAmount ?? 0), 0)
    const faturaRate = faturaNet > 0 ? Math.min(100, Math.round((faturaPaid / faturaNet) * 100)) : 100

    const overdueDues = data.dues.filter(
      (d) => d.isOverdue || d.status === 'OVERDUE' || (d.remainingAmount > 0 && new Date(d.dueDate) < new Date()),
    )

    // --- Financial Calculations for Modern Overview ---
    const allMonthsSet = new Set<string>()
    data.dues.forEach((d) => d.period && allMonthsSet.add(d.period))
    data.payments.forEach((p) => p.paymentDate && allMonthsSet.add(p.paymentDate.substring(0, 7)))
    data.expenses.forEach((e) => e.expenseDate && e.expenseDate.substring(0, 7).length === 7 && allMonthsSet.add(e.expenseDate.substring(0, 7)))
    if (financeReport) {
      financeReport.monthlyCollections.forEach((m) => m.month && allMonthsSet.add(m.month))
      financeReport.monthlyExpenses.forEach((m) => m.month && allMonthsSet.add(m.month))
    }
    const sortedMonths = Array.from(allMonthsSet).sort().reverse().slice(0, 6)

    const monthlyCashflowData = sortedMonths.map((month) => {
      const monthPayments = data.payments.filter((p) => p.paymentDate && p.paymentDate.startsWith(month))
      const monthExpenses = data.expenses.filter((e) => e.expenseDate && e.expenseDate.startsWith(month))
      const monthDues = data.dues.filter((d) => d.period === month)

      const income = monthPayments.reduce((s, p) => s + Number(p.amountPaid ?? 0), 0)
      const expense = monthExpenses.reduce((s, e) => s + Number(e.amount ?? 0), 0)
      const duesExpected = monthDues.reduce((s, d) => s + Number(d.amount ?? 0), 0)
      const net = income - expense
      const rate = duesExpected > 0 ? Math.min(100, Math.round((income / duesExpected) * 100)) : (income > 0 ? 100 : 0)

      return {
        month,
        income,
        expense,
        net,
        duesExpected,
        rate,
      }
    })

    const maxMonthlyAmount = Math.max(
      ...monthlyCashflowData.map((m) => Math.max(m.income, m.expense)),
      1000,
    )

    // Revenue Breakdown
    const totalGrossRevenue = (kiraPaid + aidatPaid + faturaPaid) || 1
    const kiraShare = Math.round((kiraPaid / totalGrossRevenue) * 100)
    const aidatShare = Math.round((aidatPaid / totalGrossRevenue) * 100)
    const faturaShare = Math.round((faturaPaid / totalGrossRevenue) * 100)

    // Expense Categories Breakdown
    const expenseCategoryMap: Record<string, { title: string; total: number; count: number }> = {}
    scopedExpenses.forEach((exp) => {
      const cat = exp.category || exp.title || 'Genel Giderler'
      if (!expenseCategoryMap[cat]) {
        expenseCategoryMap[cat] = { title: cat, total: 0, count: 0 }
      }
      expenseCategoryMap[cat].total += Number(exp.amount ?? 0)
      expenseCategoryMap[cat].count += 1
    })
    const expenseCategories = Object.values(expenseCategoryMap).sort((a, b) => b.total - a.total)
    const totalCategorizedExpense = totalExpenses || 1

    // Aging & Risk Analysis
    const unpaidDues = data.dues.filter((d) => Number(d.remainingAmount ?? 0) > 0)
    const today = new Date()

    const currentAging = { count: 0, amount: 0 }
    const lowRiskAging = { count: 0, amount: 0 } // 1-30 days
    const midRiskAging = { count: 0, amount: 0 } // 31-60 days
    const highRiskAging = { count: 0, amount: 0 } // 60+ days

    unpaidDues.forEach((d) => {
      const dueDate = new Date(d.dueDate)
      const diffDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      const rem = Number(d.remainingAmount ?? 0)

      if (diffDays <= 0) {
        currentAging.count++
        currentAging.amount += rem
      } else if (diffDays <= 30) {
        lowRiskAging.count++
        lowRiskAging.amount += rem
      } else if (diffDays <= 60) {
        midRiskAging.count++
        midRiskAging.amount += rem
      } else {
        highRiskAging.count++
        highRiskAging.amount += rem
      }
    })

    return (
      <div className="finance-hub-wrapper">
        <div className="finance-header-bar">
          <div className="finance-header-left">
            <div>
              <h2>Finans ve Kasa Yönetimi</h2>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-slate-gray)' }}>
                Kira, aidat, fatura tahakkukları, tahsilat durumu ve harcamaların canlı takibi.
              </p>
            </div>
          </div>
          <div className="finance-header-actions">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500 }}>
              <span>Dönem:</span>
              <select
                value={financeMonthFilter}
                onChange={(e) => setFinanceMonthFilter(e.target.value)}
                style={{ padding: '6px 14px', borderRadius: 'var(--radius-buttons)', border: '1px solid var(--color-hairline)', fontSize: '13px', fontWeight: 500 }}
              >
                <option value="all">Tüm Zamanlar</option>
                {distinctMonths.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="primary-button small"
              onClick={() => openCreateModal('dues')}
            >
              + Yeni Tahakkuk
            </button>
            <button
              type="button"
              className="ghost-button small"
              onClick={() => openCreateModal('expenses')}
            >
              + Yeni Gider
            </button>
          </div>
        </div>

        <div className="finance-category-grid">
          <div className="finance-category-card kasa">
            <div className="finance-card-title">
              <h4>Net Kasa Bakiyesi</h4>
              <span
                className="type-badge type-aidat"
                style={{
                  background: netKasaBalance >= 0 ? 'var(--color-soft-mint)' : '#fff1f0',
                  color: netKasaBalance >= 0 ? '#166534' : '#cf1322',
                  borderColor: netKasaBalance >= 0 ? '#bbf7d0' : '#ffccc7',
                }}
              >
                {netKasaBalance >= 0 ? 'Pozitif' : 'Negatif'}
              </span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: netKasaBalance >= 0 ? 'var(--color-vivid-green)' : '#cf1322', margin: '4px 0' }}>
              {formatCurrency(netKasaBalance)}
            </div>
            <div className="finance-progress-bar">
              <div className="finance-progress-fill green" style={{ width: `${collectionRate}%` }} />
            </div>
            <div className="finance-card-stats">
              <div>
                Toplam Tahsilat:
                <strong style={{ color: 'var(--color-vivid-green)' }}>+{formatCurrency(totalCollected)}</strong>
              </div>
              <div>
                Toplam Gider:
                <strong style={{ color: '#cf1322' }}>-{formatCurrency(totalExpenses)}</strong>
              </div>
            </div>
          </div>

          <div className="finance-category-card kira">
            <div className="finance-card-title">
              <h4>Kira Gelirleri</h4>
              <span className="finance-counter-badge" style={{ background: '#f5f3ff', color: 'var(--color-lavender)' }}>
                %{kiraRate} Tahsil
              </span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-lavender)', margin: '4px 0' }}>
              {formatCurrency(kiraPaid)}
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-slate-gray)', marginLeft: '6px' }}>
                / {formatCurrency(kiraTotal)}
              </span>
            </div>
            <div className="finance-progress-bar">
              <div className="finance-progress-fill kira" style={{ width: `${kiraRate}%` }} />
            </div>
            <div className="finance-card-stats">
              <div>
                Tahsil Edilen:
                <strong>{formatCurrency(kiraPaid)}</strong>
              </div>
              <div>
                Kalan Alacak:
                <strong style={{ color: kiraRemaining > 0 ? '#cf1322' : 'var(--color-vivid-green)' }}>{formatCurrency(kiraRemaining)}</strong>
              </div>
            </div>
          </div>

          <div className="finance-category-card aidat">
            <div className="finance-card-title">
              <h4>Aidat Gelirleri</h4>
              <span className="finance-counter-badge" style={{ background: '#eff6ff', color: 'var(--color-electric-blue)' }}>
                %{aidatRate} Tahsil
              </span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-electric-blue)', margin: '4px 0' }}>
              {formatCurrency(aidatPaid)}
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-slate-gray)', marginLeft: '6px' }}>
                / {formatCurrency(aidatTotal)}
              </span>
            </div>
            <div className="finance-progress-bar">
              <div className="finance-progress-fill aidat" style={{ width: `${aidatRate}%` }} />
            </div>
            <div className="finance-card-stats">
              <div>
                Tahsil Edilen:
                <strong>{formatCurrency(aidatPaid)}</strong>
              </div>
              <div>
                Kalan Alacak:
                <strong style={{ color: aidatRemaining > 0 ? '#cf1322' : 'var(--color-vivid-green)' }}>{formatCurrency(aidatRemaining)}</strong>
              </div>
            </div>
          </div>

          <div className="finance-category-card fatura">
            <div className="finance-card-title">
              <h4>Fatura ve Destek</h4>
              <span className="finance-counter-badge" style={{ background: '#fff7ed', color: '#c2410c' }}>
                %{faturaRate} Tahsil
              </span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#c2410c', margin: '4px 0' }}>
              {formatCurrency(faturaPaid)}
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-slate-gray)', marginLeft: '6px' }}>
                / {formatCurrency(faturaNet)}
              </span>
            </div>
            <div className="finance-progress-bar">
              <div className="finance-progress-fill fatura" style={{ width: `${faturaRate}%` }} />
            </div>
            <div className="finance-card-stats">
              <div>
                Uygulanan Destek:
                <strong style={{ color: '#166534' }}>-{formatCurrency(faturaSupport)}</strong>
              </div>
              <div>
                Kalan Net Borç:
                <strong style={{ color: faturaRemaining > 0 ? '#cf1322' : 'var(--color-vivid-green)' }}>{formatCurrency(faturaRemaining)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="finance-subnav">
          <button
            type="button"
            className={`finance-subnav-btn ${financeSubTab === 'overview' ? 'active' : ''}`}
            onClick={() => setFinanceSubTab('overview')}
          >
            Genel Özet & Analiz
          </button>
          <button
            type="button"
            className={`finance-subnav-btn ${financeSubTab === 'dues' ? 'active' : ''}`}
            onClick={() => setFinanceSubTab('dues')}
          >
            Tüm Tahakkuklar
            <span className="finance-counter-badge">{filteredDues.length}</span>
          </button>
          <button
            type="button"
            className={`finance-subnav-btn ${financeSubTab === 'payments' ? 'active' : ''}`}
            onClick={() => setFinanceSubTab('payments')}
          >
            Tahsilat Geçmişi
            <span className="finance-counter-badge">{scopedPayments.length}</span>
          </button>
          <button
            type="button"
            className={`finance-subnav-btn ${financeSubTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setFinanceSubTab('expenses')}
          >
            Giderler ve Harcamalar
            <span className="finance-counter-badge">{filteredExpenses.length}</span>
          </button>
        </div>

        {financeSubTab === 'overview' && (
          <div className="stack-grid">
            {/* 1. Alacak Yaşlandırma & Risk Matrisi (Aging Matrix) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--color-charcoal)' }}>Alacak Yaşlandırma ve Risk Durumu</h3>
                <span style={{ fontSize: '12px', color: 'var(--color-steel)' }}>
                  Toplam Açık Alacak: <strong>{formatCurrency(unpaidDues.reduce((s, d) => s + Number(d.remainingAmount ?? 0), 0))}</strong>
                </span>
              </div>
              <div className="aging-matrix-grid">
                <div className="aging-box current">
                  <span>Gelecek Vade</span>
                  <strong>{formatCurrency(currentAging.amount)}</strong>
                  <small>{currentAging.count} adet kalem • Vadesi gelmemiş</small>
                </div>
                <div className="aging-box low-risk">
                  <span>1 - 30 Gün Gecikme</span>
                  <strong>{formatCurrency(lowRiskAging.amount)}</strong>
                  <small>{lowRiskAging.count} adet kalem • İlk takip</small>
                </div>
                <div className="aging-box mid-risk">
                  <span>31 - 60 Gün Gecikme</span>
                  <strong>{formatCurrency(midRiskAging.amount)}</strong>
                  <small>{midRiskAging.count} adet kalem • Hatırlatma gerekli</small>
                </div>
                <div className="aging-box high-risk">
                  <span>60+ Gün Kritik Gecikme</span>
                  <strong style={{ color: '#dc2626' }}>{formatCurrency(highRiskAging.amount)}</strong>
                  <small style={{ color: '#dc2626' }}>{highRiskAging.count} adet kalem • Kritik / İcra riski</small>
                </div>
              </div>
            </div>

            {/* 2. Karşılaştırmalı Aylık Nakit Akışı Tablosu & Çubukları */}
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Aylık Karşılaştırmalı Nakit Akışı (Gelir vs Gider)</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-steel)' }}>
                    Her ayın net tahsilatını, gider harcamalarını ve kasa fazlası / açığını anlık kıyaslayın.
                  </p>
                </div>
              </div>

              {monthlyCashflowData.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Dönem</th>
                        <th>Tahsilat (Gelir)</th>
                        <th>Harcama (Gider)</th>
                        <th>Görsel Dağılım (Gelir / Gider)</th>
                        <th>Net Kasa Akışı</th>
                        <th>Tahsilat Oranı</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyCashflowData.map((row) => {
                        const incomePercent = Math.min(100, Math.round((row.income / maxMonthlyAmount) * 100))
                        const expensePercent = Math.min(100, Math.round((row.expense / maxMonthlyAmount) * 100))
                        const isPositive = row.net >= 0

                        return (
                          <tr key={row.month}>
                            <td>
                              <strong>{row.month}</strong>
                            </td>
                            <td>
                              <strong style={{ color: 'var(--color-vivid-green)' }}>
                                +{formatCurrency(row.income)}
                              </strong>
                            </td>
                            <td>
                              <strong style={{ color: '#dc2626' }}>
                                -{formatCurrency(row.expense)}
                              </strong>
                            </td>
                            <td style={{ minWidth: '160px' }}>
                              <div className="cashflow-bar-group">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div className="cashflow-bar-track" style={{ flex: 1 }}>
                                    <div className="cashflow-bar-fill income" style={{ width: `${incomePercent}%` }} />
                                  </div>
                                  <span style={{ fontSize: '11px', color: 'var(--color-vivid-green)', width: '32px', textAlign: 'right' }}>
                                    %{incomePercent}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div className="cashflow-bar-track" style={{ flex: 1 }}>
                                    <div className="cashflow-bar-fill expense" style={{ width: `${expensePercent}%` }} />
                                  </div>
                                  <span style={{ fontSize: '11px', color: '#dc2626', width: '32px', textAlign: 'right' }}>
                                    %{expensePercent}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span
                                className="status"
                                style={{
                                  background: isPositive ? 'var(--color-soft-mint)' : '#fef2f2',
                                  color: isPositive ? '#166534' : '#991b1b',
                                  borderColor: isPositive ? '#bbf7d0' : '#fecaca',
                                }}
                              >
                                {isPositive ? `+${formatCurrency(row.net)} (Fazla)` : `${formatCurrency(row.net)} (Açık)`}
                              </span>
                            </td>
                            <td>
                              <span className="badge muted">
                                %{row.rate}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ margin: 0, padding: '20px', textAlign: 'center', color: 'var(--color-slate-gray)', fontSize: '13px' }}>
                  Kayıtlı nakit akışı verisi bulunmuyor.
                </p>
              )}
            </div>

            {/* 3. 2-Sütunlu Kategori Kırılımı (Gelir Kaynakları vs Gider Kalemleri) */}
            <div className="breakdown-grid">
              {/* Gelir Kırılımı */}
              <div className="panel">
                <div className="panel-header">
                  <h3>Gelir Kaynakları Dağılımı</h3>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-vivid-green)' }}>
                    +{formatCurrency(totalGrossRevenue)}
                  </span>
                </div>
                <div>
                  <div className="breakdown-item">
                    <div className="breakdown-item-header">
                      <span>Kira Gelirleri</span>
                      <strong>{formatCurrency(kiraPaid)} (%{kiraShare})</strong>
                    </div>
                    <div className="breakdown-progress-track">
                      <div className="breakdown-progress-fill" style={{ width: `${kiraShare}%`, background: 'var(--color-lavender)' }} />
                    </div>
                  </div>

                  <div className="breakdown-item">
                    <div className="breakdown-item-header">
                      <span>Aidat Gelirleri</span>
                      <strong>{formatCurrency(aidatPaid)} (%{aidatShare})</strong>
                    </div>
                    <div className="breakdown-progress-track">
                      <div className="breakdown-progress-fill" style={{ width: `${aidatShare}%`, background: 'var(--color-electric-blue)' }} />
                    </div>
                  </div>

                  <div className="breakdown-item">
                    <div className="breakdown-item-header">
                      <span>Fatura Tahsilatları</span>
                      <strong>{formatCurrency(faturaPaid)} (%{faturaShare})</strong>
                    </div>
                    <div className="breakdown-progress-track">
                      <div className="breakdown-progress-fill" style={{ width: `${faturaShare}%`, background: 'var(--color-tangerine)' }} />
                    </div>
                  </div>

                  {faturaSupport > 0 ? (
                    <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--color-paper-mist)', borderRadius: 'var(--radius-inputs)', fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: 'var(--color-steel)' }}>
                      <span>Yönetim Tarafından Sağlanan Fatura Desteği:</span>
                      <strong style={{ color: '#166534' }}>-{formatCurrency(faturaSupport)}</strong>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Gider Kırılımı */}
              <div className="panel">
                <div className="panel-header">
                  <h3>Gider Kalemleri Dağılımı</h3>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626' }}>
                    -{formatCurrency(totalExpenses)}
                  </span>
                </div>
                <div>
                  {expenseCategories.slice(0, 4).map((cat) => {
                    const share = Math.round((cat.total / totalCategorizedExpense) * 100)
                    return (
                      <div className="breakdown-item" key={cat.title}>
                        <div className="breakdown-item-header">
                          <span>{cat.title} ({cat.count} işlem)</span>
                          <strong>{formatCurrency(cat.total)} (%{share})</strong>
                        </div>
                        <div className="breakdown-progress-track">
                          <div className="breakdown-progress-fill" style={{ width: `${share}%`, background: '#dc2626' }} />
                        </div>
                      </div>
                    )
                  })}
                  {expenseCategories.length === 0 && (
                    <p style={{ margin: 0, padding: '24px 0', textAlign: 'center', color: 'var(--color-slate-gray)', fontSize: '13px' }}>
                      Seçilen dönemde kaydedilmiş bir gider kalemi yok.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 4. Kritik ve Gecikmiş Alacaklar Takip Masası */}
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Kritik ve Gecikmiş Alacaklar Takip Masası</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--color-steel)' }}>
                    Vadesi geçen ödemeleri doğrudan takip edin ve tek tıkla tahsilat gerçekleştirin.
                  </p>
                </div>
                <button
                  type="button"
                  className="ghost-button small"
                  onClick={() => setFinanceSubTab('dues')}
                >
                  Tüm Tahakkuklara Git ({filteredDues.length})
                </button>
              </div>

              {overdueDues.length > 0 ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Daire / Blok</th>
                        <th>Borç Türü</th>
                        <th>Dönem</th>
                        <th>Vade Tarihi</th>
                        <th>Gecikme Süresi</th>
                        <th>Kalan Borç</th>
                        <th>Aksiyon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overdueDues.slice(0, 6).map((dueItem) => {
                        const daysOverdue = Math.max(
                          1,
                          Math.floor((Date.now() - new Date(dueItem.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
                        )
                        return (
                          <tr key={dueItem.id}>
                            <td>
                              <strong>{getApartmentLabel(dueItem.apartmentId)}</strong>
                            </td>
                            <td>{renderDueTypeBadge(dueItem.dueType)}</td>
                            <td>{dueItem.period}</td>
                            <td>{formatDate(dueItem.dueDate)}</td>
                            <td>
                              <span
                                className="status danger"
                                style={{ fontSize: '11px', padding: '2px 8px' }}
                              >
                                {daysOverdue} gün gecikmede
                              </span>
                            </td>
                            <td>
                              <strong style={{ color: '#dc2626', fontSize: '14px' }}>
                                {formatCurrency(dueItem.remainingAmount)}
                              </strong>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  type="button"
                                  className="btn-mark-paid"
                                  style={{ padding: '4px 10px', fontSize: '12px' }}
                                  onClick={() => openPaymentConfirm(dueItem)}
                                >
                                  Tahsil Et
                                </button>
                                <button
                                  type="button"
                                  className="table-action"
                                  onClick={() => void openDetailModal('dues', dueItem)}
                                >
                                  Detay
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ margin: 0, padding: '24px', textAlign: 'center', color: 'var(--color-vivid-green)', fontSize: '13px', background: 'var(--color-paper-mist)', borderRadius: 'var(--radius-inputs)' }}>
                  Tebrikler! Vadesi geçmiş herhangi bir ödeme bulunmuyor.
                </p>
              )}
            </div>
          </div>
        )}

        {financeSubTab === 'dues' && (
          <ResourceTable
            title="Kira, Aidat ve Fatura Tahakkukları"
            rows={filteredDues}
            createLabel="Yeni tahakkuk oluştur"
            onCreate={() => openCreateModal('dues')}
            onEdit={(row) => openEditModal('dues', row)}
            onView={(row) => void openDetailModal('dues', row)}
            onDelete={handleDeleteDue}
            headerActions={
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-quick-action primary"
                  onClick={() => openBulkDueModal('all')}
                >
                  ⚡ Toplu Tahakkuk Sihirbazı
                </button>
                <button
                  type="button"
                  className="btn-quick-action"
                  onClick={() => openBulkImportModal()}
                >
                  📥 Excel / CSV Sayaç & Fatura Yükle
                </button>
                <button
                  type="button"
                  className="btn-quick-action"
                  onClick={() => handleExportDuesCsv()}
                >
                  📤 CSV İndir
                </button>
              </div>
            }
            toolbar={renderFilterToolbar('dues', {
              searchPlaceholder: 'Dönem, daire, tür veya açıklama ara',
              sortOptions: [
                { value: 'dueDate', label: 'Vade tarihine göre' },
                { value: 'amount', label: 'Tutara göre' },
                { value: 'remainingAmount', label: 'Kalan bakiyeye göre' },
                { value: 'period', label: 'Döneme göre' },
              ],
              statusOptions: [
                { value: 'all', label: 'Tüm durumlar' },
                { value: 'PENDING', label: 'Beklemede' },
                { value: 'PAID', label: 'Ödendi' },
                { value: 'OVERDUE', label: 'Gecikmiş' },
              ],
              activityOptions: [
                { value: 'all', label: 'Tümü' },
                { value: 'overdue', label: 'Sadece gecikenler' },
                { value: 'current', label: 'Gecikmeyenler' },
              ],
              extraFields: (
                <>
                  <label className="toolbar-field">
                    <span>Tür</span>
                    <select value={filters.dues.dueType ?? 'all'} onChange={(event) => updateFilter('dues', { dueType: event.target.value })}>
                      <option value="all">Tüm Türler</option>
                      <option value="AIDAT">Aidat</option>
                      <option value="KIRA">Kira</option>
                      <option value="FATURA">Fatura</option>
                      <option value="DIGER">Diğer</option>
                    </select>
                  </label>
                  <label className="toolbar-field">
                    <span>Site</span>
                    <select value={filters.dues.siteId ?? 'all'} onChange={(event) => updateFilter('dues', { siteId: event.target.value })}>
                      <option value="all">Tümü</option>
                      {data.sites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="toolbar-field">
                    <span>Ay</span>
                    <select value={filters.dues.month ?? 'all'} onChange={(event) => updateFilter('dues', { month: event.target.value })}>
                      <option value="all">Tümü</option>
                      {distinctMonths.map((period) => (
                        <option key={period} value={period}>
                          {period}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ),
            })}
            columns={[
              { key: 'dueType', label: 'Tür', render: (row) => renderDueTypeBadge(String(row.dueType ?? 'AIDAT')) },
              { key: 'period', label: 'Dönem' },
              { key: 'apartmentId', label: 'Daire', render: (row) => getApartmentLabel(String(row.apartmentId)) },
              {
                key: 'description',
                label: 'Açıklama & Detay',
                render: (row) => {
                  const due = row as unknown as Due
                  return (
                    <div>
                      <div>{due.description || `${due.period} ${translateDueType(due.dueType)}`}</div>
                      {due.dueType === 'FATURA' && (due.electricityAmount || due.waterAmount || due.gasAmount) ? (
                        <div className="utility-breakdown">
                          {due.electricityAmount ? <span className="utility-pill">Elk: {formatCurrency(due.electricityAmount)}</span> : null}
                          {due.waterAmount ? <span className="utility-pill">Su: {formatCurrency(due.waterAmount)}</span> : null}
                          {due.gasAmount ? <span className="utility-pill">Gaz: {formatCurrency(due.gasAmount)}</span> : null}
                          {due.billSupportAmount ? <span className="utility-pill support">Destek: -{formatCurrency(due.billSupportAmount)}</span> : null}
                        </div>
                      ) : null}
                    </div>
                  )
                },
              },
              { key: 'amount', label: 'Net Tutar', render: (row) => formatCurrency(Number(row.amount)) },
              {
                key: 'remainingAmount',
                label: 'Kalan Borç',
                render: (row) => (
                  <strong style={{ color: Number(row.remainingAmount) > 0 ? '#cf1322' : 'var(--color-forest)' }}>
                    {formatCurrency(Number(row.remainingAmount))}
                  </strong>
                ),
              },
              { key: 'dueDate', label: 'Vade tarihi', render: (row) => formatDate(String(row.dueDate)) },
              { key: 'status', label: 'Durum', render: (row) => <StatusPill value={String(row.status)} /> },
              {
                key: 'action',
                label: 'Hızlı İşlem',
                render: (row) => {
                  const due = row as unknown as Due
                  return due.remainingAmount > 0 ? (
                    <button
                      type="button"
                      className="btn-mark-paid"
                      onClick={() => openPaymentConfirm(due)}
                    >
                      Ödendi İşaretle
                    </button>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--color-forest)', fontWeight: 600 }}>Tahsil Edildi</span>
                  )
                },
              },
            ]}
          />
        )}

        {financeSubTab === 'payments' && (
          <ResourceTable
            title="Tahsil Edilen Ödemeler"
            rows={scopedPayments}
            columns={[
              {
                key: 'dueId',
                label: 'İlgili Kalem / Daire',
                render: (row) => {
                  const due = data.dues.find((d) => d.id === String(row.dueId))
                  return due ? (
                    <div>
                      <strong>{getApartmentLabel(due.apartmentId)}</strong>
                      <span style={{ marginLeft: '6px' }}>{renderDueTypeBadge(due.dueType)} ({due.period})</span>
                    </div>
                  ) : (
                    String(row.dueId)
                  )
                },
              },
              {
                key: 'amountPaid',
                label: 'Tahsil Edilen Tutar',
                render: (row) => <strong style={{ color: '#16a34a' }}>+{formatCurrency(Number(row.amountPaid))}</strong>,
              },
              { key: 'paymentDate', label: 'Ödeme Tarihi', render: (row) => formatDate(String(row.paymentDate)) },
              { key: 'paymentMethod', label: 'Ödeme Yöntemi' },
            ]}
          />
        )}

        {financeSubTab === 'expenses' && (
          <ResourceTable
            title="Giderler ve Harcamalar"
            rows={filteredExpenses}
            createLabel="Yeni gider ekle"
            onCreate={() => openCreateModal('expenses')}
            onEdit={(row) => openEditModal('expenses', row)}
            onDelete={handleDeleteExpense}
            toolbar={renderFilterToolbar('expenses', {
              searchPlaceholder: 'Başlık, kategori veya fatura no ara',
              sortOptions: [
                { value: 'expenseDate', label: 'Harcama tarihine göre' },
                { value: 'amount', label: 'Tutara göre' },
                { value: 'title', label: 'Başlığa göre' },
              ],
            })}
            columns={[
              { key: 'title', label: 'Gider Başlığı' },
              {
                key: 'category',
                label: 'Kategori',
                render: (row) => (
                  <span className="type-badge type-diger" style={{ fontWeight: 600 }}>
                    {String(row.category ?? 'Genel')}
                  </span>
                ),
              },
              {
                key: 'amount',
                label: 'Tutar',
                render: (row) => <strong style={{ color: '#dc2626' }}>-{formatCurrency(Number(row.amount))}</strong>,
              },
              { key: 'expenseDate', label: 'Harcama Tarihi', render: (row) => formatDate(String(row.expenseDate)) },
              { key: 'invoiceUrl', label: 'Fatura / Belge No', render: (row) => String(row.invoiceUrl || '—') },
            ]}
          />
        )}
      </div>
    )
  }

  const renderAnnouncements = () => (
    <ResourceTable
      title="Duyurular"
      rows={filteredAnnouncements}
      onDelete={handleDeleteAnnouncement}
      emptyMessage="Bu aramaya uygun duyuru bulunamadı."
      toolbar={renderFilterToolbar('announcements', {
        searchPlaceholder: 'Başlık, içerik veya oluşturan ara',
        sortOptions: [
          { value: 'createdAt', label: 'Oluşturulma tarihine göre' },
          { value: 'title', label: 'Başlığa göre' },
        ],
      })}
      columns={[
        { key: 'title', label: 'Başlık' },
        { key: 'content', label: 'İçerik' },
        { key: 'createdBy', label: 'Oluşturan', render: (row) => getUserLabelById(data.users, String(row.createdBy)) },
        { key: 'createdAt', label: 'Oluşturulma', render: (row) => formatDate(String(row.createdAt)) },
      ]}
    />
  )

  const renderTickets = () => (
    <ResourceTable
      title="Talepler"
      rows={filteredTickets}
      onDelete={handleDeleteTicket}
      emptyMessage="Bu aramaya uygun talep bulunamadı."
      toolbar={renderFilterToolbar('tickets', {
        searchPlaceholder: 'Başlık, açıklama veya durum ara',
        sortOptions: [
          { value: 'createdAt', label: 'Oluşturulma tarihine göre' },
          { value: 'title', label: 'Başlığa göre' },
        ],
        statusOptions: [
          { value: 'all', label: 'Tüm durumlar' },
          { value: 'OPEN', label: 'Açık' },
          { value: 'IN_PROGRESS', label: 'İşlemde' },
          { value: 'RESOLVED', label: 'Çözüldü' },
        ],
        activityOptions: [
          { value: 'all', label: 'Tümü' },
          { value: 'active', label: 'Açık olanlar' },
          { value: 'inactive', label: 'Çözülenler' },
        ],
      })}
      columns={[
        { key: 'title', label: 'Başlık' },
        { key: 'description', label: 'Açıklama' },
        { key: 'status', label: 'Durum', render: (row) => <StatusPill value={String(row.status)} /> },
        { key: 'priority', label: 'Öncelik', render: (row) => <StatusPill value={String(row.priority)} /> },
        { key: 'createdAt', label: 'Tarih', render: (row) => formatDate(String(row.createdAt)) },
      ]}
    />
  )

  const renderAudit = () => (
    <ResourceTable
      title="Denetim kayıtları"
      rows={data.auditLogs}
      columns={[
        { key: 'action', label: 'İşlem' },
        { key: 'entityName', label: 'Varlık' },
        { key: 'details', label: 'Detaylar' },
        { key: 'timestamp', label: 'Zaman damgası', render: (row) => formatDate(String(row.timestamp)) },
      ]}
    />
  )

  const renderDocumentSection = () => (
    detailModal?.entity === 'blocks' ? null : (
    <div className="panel detail-panel">
      <div className="panel-header">
        <h3>Dokümanlar</h3>
      </div>

      {documentLoading ? (
        <div className="empty-state">Dokümanlar yükleniyor…</div>
      ) : propertyDocuments.length ? (
        <div className="list-stack">
          {propertyDocuments.map((item) => (
            <div className="list-item" key={item.id}>
              <div>
                <strong>{item.fileName}</strong>
                <p>{item.documentCategory}{item.notes ? ` • ${item.notes}` : ''}</p>
                <a className="link-button" href={item.fileUrl} target="_blank" rel="noreferrer">
                  Dokümanı aç
                </a>
              </div>
              <button type="button" className="table-action danger" onClick={() => void handleDeleteDocument(item.id)}>
                Sil
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">Bu kayda ait doküman bulunmuyor.</div>
      )}

      <form className="modal-form document-form" onSubmit={handleAddDocument}>
        <div className="form-grid">
          <label className="field">
            <span>Kategori</span>
            <input
              type="text"
              value={documentForm.documentCategory}
              onChange={(event) => setDocumentForm((current) => ({ ...current, documentCategory: event.target.value }))}
              placeholder="Örn. Sözleşme"
            />
          </label>
          <label className="field">
            <span>Dosya adı</span>
            <input
              type="text"
              value={documentForm.fileName}
              onChange={(event) => setDocumentForm((current) => ({ ...current, fileName: event.target.value }))}
              placeholder="Örn. kira-sozlesmesi.pdf"
            />
          </label>
          <label className="field full">
            <span>Dosya bağlantısı</span>
            <input
              type="url"
              value={documentForm.fileUrl}
              onChange={(event) => setDocumentForm((current) => ({ ...current, fileUrl: event.target.value }))}
              placeholder="https://..."
            />
          </label>
          <label className="field full">
            <span>Not</span>
            <textarea
              value={documentForm.notes}
              onChange={(event) => setDocumentForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Kısa açıklama"
            />
          </label>
        </div>
        <div className="modal-actions">
          <button type="submit" className="primary-button" disabled={documentSaving}>
            {documentSaving ? 'Kaydediliyor…' : 'Doküman ekle'}
          </button>
        </div>
      </form>
    </div>
    )
  )

  const renderDetailContent = () => {
    if (!detailModal || !detailRecord) {
      return <div className="empty-state">Detay bilgisi bulunamadı.</div>
    }

    if (detailModal.entity === 'sites') {
      const site = detailRecord as unknown as Site
      const siteBlocks = data.blocks.filter((block) => block.siteId === site.id)
      const siteBlockIds = new Set(siteBlocks.map((block) => block.id))
      const siteApartments = data.apartments.filter((apartment) => siteBlockIds.has(apartment.blockId))
      const siteApartmentIds = new Set(siteApartments.map((apartment) => apartment.id))
      const siteOwners = data.owners.filter((owner) => siteApartmentIds.has(owner.apartmentId))
      const siteTenants = data.tenants.filter((tenant) => siteApartmentIds.has(tenant.apartmentId))
      const siteDues = data.dues.filter((due) => siteApartmentIds.has(due.apartmentId))

      return (
        <div className="detail-layout">
          <div className="detail-summary-grid">
            <div className="detail-stat"><span>Blok sayısı</span><strong>{siteBlocks.length}</strong></div>
            <div className="detail-stat"><span>Daire sayısı</span><strong>{siteApartments.length}</strong></div>
            <div className="detail-stat"><span>Aktif sakin</span><strong>{siteTenants.filter((item) => item.isActive).length}</strong></div>
            <div className="detail-stat"><span>Bekleyen aidat</span><strong>{siteDues.filter((item) => item.remainingAmount > 0).length}</strong></div>
          </div>
          <div className="detail-card-grid">
            <div className="panel detail-panel">
              <div className="panel-header"><h3>İletişim</h3></div>
              <div className="detail-data-list">
                <div><span>Adres</span><strong>{site.address || '—'}</strong></div>
                <div><span>Telefon</span><strong>{site.phone || '—'}</strong></div>
                <div><span>E-posta</span><strong>{site.email || '—'}</strong></div>
              </div>
            </div>
            <div className="panel detail-panel">
              <div className="panel-header"><h3>Operasyon özeti</h3></div>
              <div className="detail-data-list">
                <div><span>Sahip sayısı</span><strong>{siteOwners.length}</strong></div>
                <div><span>Kiracı sayısı</span><strong>{siteTenants.length}</strong></div>
                <div><span>Toplam açık bakiye</span><strong>{formatCurrency(siteDues.reduce((sum, item) => sum + item.remainingAmount, 0))}</strong></div>
              </div>
            </div>
          </div>
          <div className="panel detail-panel">
            <div className="panel-header">
              <h3>Bağlı bloklar</h3>
              <button type="button" className="primary-button small" onClick={() => openCreateModal('blocks', { siteId: site.id })}>
                Yeni blok
              </button>
            </div>
            {siteBlocks.length ? (
              <div className="list-stack">
                {siteBlocks.map((block) => (
                  <div className="list-item" key={block.id}>
                    <div>
                      <strong>{block.name}</strong>
                      <p>{data.apartments.filter((apartment) => apartment.blockId === block.id).length} daire</p>
                    </div>
                    <div className="inline-actions">
                      <button type="button" className="table-action primary" onClick={() => void openDetailModal('blocks', block)}>
                        Detay
                      </button>
                      <button type="button" className="table-action" onClick={() => openEditModal('blocks', block)}>
                        Düzenle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">Bu siteye bağlı blok bulunmuyor.</div>
            )}
          </div>
          {renderDocumentSection()}
        </div>
      )
    }

    if (detailModal.entity === 'blocks') {
      const block = detailRecord as unknown as Block
      const blockApartments = data.apartments.filter((apartment) => apartment.blockId === block.id)
      const blockApartmentIds = new Set(blockApartments.map((apartment) => apartment.id))
      const blockOwners = data.owners.filter((owner) => blockApartmentIds.has(owner.apartmentId))
      const blockTenants = data.tenants.filter((tenant) => blockApartmentIds.has(tenant.apartmentId))
      const blockDues = data.dues.filter((due) => blockApartmentIds.has(due.apartmentId))

      return (
        <div className="detail-layout">
          <div className="detail-summary-grid">
            <div className="detail-stat"><span>Daire sayısı</span><strong>{blockApartments.length}</strong></div>
            <div className="detail-stat"><span>Sahip sayısı</span><strong>{blockOwners.length}</strong></div>
            <div className="detail-stat"><span>Kiracı sayısı</span><strong>{blockTenants.length}</strong></div>
            <div className="detail-stat"><span>Açık bakiye</span><strong>{formatCurrency(blockDues.reduce((sum, item) => sum + item.remainingAmount, 0))}</strong></div>
          </div>
          <div className="detail-card-grid">
            <div className="panel detail-panel">
              <div className="panel-header"><h3>Temel bilgiler</h3></div>
              <div className="detail-data-list">
                <div><span>Site</span><strong>{getSiteNameFromBlockId(block.id)}</strong></div>
                <div><span>Blok adı</span><strong>{block.name}</strong></div>
                <div><span>Oluşturulma</span><strong>{formatDate(block.createdAt)}</strong></div>
              </div>
            </div>
            <div className="panel detail-panel">
              <div className="panel-header"><h3>Bağlı daireler</h3></div>
              {blockApartments.length ? (
                <div className="list-stack">
                  {blockApartments.map((apartment) => (
                    <div className="list-item" key={apartment.id}>
                      <div>
                        <strong>Daire {apartment.apartmentNumber}</strong>
                        <p>{apartment.apartmentType} • Kat {apartment.floor}</p>
                      </div>
                      <button type="button" className="table-action primary" onClick={() => void openDetailModal('apartments', apartment)}>
                        Detay
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">Bu blokta daire bulunmuyor.</div>
              )}
            </div>
          </div>
          {renderDocumentSection()}
        </div>
      )
    }

    if (detailModal.entity === 'apartments') {
      const apartment = detailRecord as unknown as Apartment
      const apartmentOwners = data.owners.filter((item) => item.apartmentId === apartment.id)
      const apartmentTenants = data.tenants.filter((item) => item.apartmentId === apartment.id)
      const apartmentDues = data.dues.filter((item) => item.apartmentId === apartment.id)

      return (
        <div className="detail-layout">
          <div className="detail-summary-grid">
            <div className="detail-stat"><span>Blok</span><strong>{getBlockName(apartment.blockId)}</strong></div>
            <div className="detail-stat"><span>Site</span><strong>{getSiteNameFromBlockId(apartment.blockId)}</strong></div>
            <div className="detail-stat"><span>Sahip sayısı</span><strong>{apartmentOwners.length}</strong></div>
            <div className="detail-stat"><span>Kiracı sayısı</span><strong>{apartmentTenants.length}</strong></div>
          </div>
          <div className="detail-card-grid">
            <div className="panel detail-panel">
              <div className="panel-header"><h3>Temel bilgiler</h3></div>
              <div className="detail-data-list">
                <div><span>Daire numarası</span><strong>{apartment.apartmentNumber}</strong></div>
                <div><span>Kat</span><strong>{apartment.floor}</strong></div>
                <div><span>Tip</span><strong>{apartment.apartmentType}</strong></div>
                <div><span>Tapu numarası</span><strong>{apartment.tapuNumber || '—'}</strong></div>
              </div>
            </div>
            <div className="panel detail-panel">
              <div className="panel-header"><h3>Finans özeti</h3></div>
              <div className="detail-data-list">
                <div><span>Toplam aidat</span><strong>{formatCurrency(apartmentDues.reduce((sum, item) => sum + item.amount, 0))}</strong></div>
                <div><span>Kalan bakiye</span><strong>{formatCurrency(apartmentDues.reduce((sum, item) => sum + item.remainingAmount, 0))}</strong></div>
                <div><span>Geciken kayıt</span><strong>{apartmentDues.filter((item) => item.isOverdue).length}</strong></div>
              </div>
            </div>
          </div>
          <div className="detail-card-grid">
            <div className="panel detail-panel">
              <div className="panel-header"><h3>Bağlı sahipler</h3></div>
              {apartmentOwners.length ? (
                <div className="list-stack">
                  {apartmentOwners.map((owner) => (
                    <div className="list-item" key={owner.id}>
                      <div>
                        <strong>{owner.fullName}</strong>
                        <p>{owner.phone || '—'}</p>
                      </div>
                      <button type="button" className="table-action primary" onClick={() => void openDetailModal('owners', owner)}>
                        Detay
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">Bu daireye bağlı sahip yok.</div>
              )}
            </div>
            <div className="panel detail-panel">
              <div className="panel-header"><h3>Bağlı kiracılar</h3></div>
              {apartmentTenants.length ? (
                <div className="list-stack">
                  {apartmentTenants.map((tenant) => (
                    <div className="list-item" key={tenant.id}>
                      <div>
                        <strong>{tenant.fullName}</strong>
                        <p>{tenant.isActive ? 'Aktif' : 'Pasif'}</p>
                      </div>
                      <button type="button" className="table-action primary" onClick={() => void openDetailModal('tenants', tenant)}>
                        Detay
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">Bu daireye bağlı kiracı yok.</div>
              )}
            </div>
          </div>
          {renderDocumentSection()}
        </div>
      )
    }

    if (detailModal.entity === 'owners') {
      const owner = detailRecord as unknown as Owner
      const ownerApartment = apartmentsById.get(owner.apartmentId)
      const ownerDues = data.dues.filter((item) => item.apartmentId === owner.apartmentId)

      return (
        <div className="detail-layout">
          <div className="detail-summary-grid">
            <div className="detail-stat"><span>Daire</span><strong>{ownerApartment?.apartmentNumber ?? '—'}</strong></div>
            <div className="detail-stat"><span>Site</span><strong>{getSiteNameFromApartmentId(owner.apartmentId)}</strong></div>
            <div className="detail-stat"><span>Açık bakiye</span><strong>{formatCurrency(ownerDues.reduce((sum, item) => sum + item.remainingAmount, 0))}</strong></div>
            <div className="detail-stat"><span>Durum</span><strong>{owner.isActive ? 'Aktif' : 'Pasif'}</strong></div>
          </div>
          <div className="detail-card-grid">
            <div className="panel detail-panel">
              <div className="panel-header"><h3>İletişim</h3></div>
              <div className="detail-data-list">
                <div><span>Ad soyad</span><strong>{owner.fullName}</strong></div>
                <div><span>Telefon</span><strong>{owner.phone || '—'}</strong></div>
                <div><span>E-posta</span><strong>{owner.email || '—'}</strong></div>
                <div><span>Kimlik no</span><strong>{owner.idNumber || '—'}</strong></div>
              </div>
            </div>
          </div>
          <div className="panel detail-panel">
            <div className="panel-header"><h3>Bağlı daire</h3></div>
            <div className="detail-data-list">
              <div><span>Daire</span><strong>{ownerApartment?.apartmentNumber ?? '—'}</strong></div>
              <div><span>Blok</span><strong>{ownerApartment ? getBlockName(ownerApartment.blockId) : '—'}</strong></div>
            </div>
            {ownerApartment ? (
              <div className="modal-actions detail-actions">
                <button type="button" className="primary-button small" onClick={() => void openDetailModal('apartments', ownerApartment)}>
                  Daire detayına git
                </button>
              </div>
            ) : null}
          </div>
          {renderDocumentSection()}
        </div>
      )
    }

    if (detailModal.entity === 'tenants') {
      const tenant = detailRecord as unknown as Tenant
      const tenantApartment = apartmentsById.get(tenant.apartmentId)
      const tenantDues = data.dues.filter((item) => item.apartmentId === tenant.apartmentId || item.tenantId === tenant.id)
      const monthDues = tenantDues.filter((item) => item.period === selectedTenantMonth)
      const totalMonthPayable = monthDues.reduce((sum, item) => sum + item.remainingAmount, 0)

      return (
        <div className="detail-layout">
          <div className="detail-summary-grid">
            <div className="detail-stat"><span>Daire</span><strong>{tenantApartment?.apartmentNumber ?? '—'}</strong></div>
            <div className="detail-stat"><span>Site</span><strong>{getSiteNameFromApartmentId(tenant.apartmentId)}</strong></div>
            <div className="detail-stat"><span>Giriş tarihi</span><strong>{formatDate(tenant.moveInDate)}</strong></div>
            <div className="detail-stat"><span>Durum</span><strong>{tenant.isActive ? 'Aktif' : 'Pasif'}</strong></div>
          </div>

          <div className="detail-card-grid">
            <div className="panel detail-panel">
              <div className="panel-header"><h3>İletişim & Bilgiler</h3></div>
              <div className="detail-data-list">
                <div><span>Ad soyad</span><strong>{tenant.fullName}</strong></div>
                <div><span>Telefon</span><strong>{tenant.phone || '—'}</strong></div>
                <div><span>E-posta</span><strong>{tenant.email || '—'}</strong></div>
                <div><span>Kimlik no</span><strong>{tenant.idNumber || '—'}</strong></div>
              </div>
            </div>

            <div className="panel detail-panel">
              <div className="panel-header"><h3>Tanımlı Aylık Kalemler</h3></div>
              <div className="detail-data-list">
                <div><span>Aylık Kira</span><strong>{tenant.monthlyRent ? formatCurrency(tenant.monthlyRent) : 'Tanımlanmamış'}</strong></div>
                <div><span>Aylık Aidat</span><strong>{tenant.monthlyDue ? formatCurrency(tenant.monthlyDue) : 'Tanımlanmamış'}</strong></div>
                <div><span>Fatura Desteği</span><strong style={{ color: '#047857' }}>{tenant.defaultBillSupport ? `-${formatCurrency(tenant.defaultBillSupport)}` : 'Yok'}</strong></div>
                <div><span>Toplam Açık Borç</span><strong style={{ color: '#b91c1c' }}>{formatCurrency(tenantDues.reduce((sum, item) => sum + item.remainingAmount, 0))}</strong></div>
              </div>
            </div>
          </div>

          {/* Aylık Kira, Aidat ve Fatura Takip Paneli */}
          <div className="panel detail-panel" style={{ marginTop: '16px' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3>📅 Aylık Ödeme Kalemleri Takibi</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                  Seçilen aya ait Kira, Aidat ve Faturaları takip edin, tahsilatları tek tıkla onaylayın.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>Dönem:</label>
                <input
                  type="month"
                  value={selectedTenantMonth}
                  onChange={(e) => setSelectedTenantMonth(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--line-strong)', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ margin: '14px 0', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-quick-action primary"
                disabled={processingAction}
                onClick={() => openBillModal(tenant)}
              >
                Fatura Girişi ve Hesaplayıcı
              </button>

              {(Number(tenant.monthlyRent || 0) > 0 || Number(tenant.monthlyDue || 0) > 0) ? (
                <button
                  type="button"
                  className="btn-quick-action"
                  disabled={processingAction}
                  onClick={() => void handleGenerateMonthlyObligations(tenant, selectedTenantMonth)}
                >
                  {selectedTenantMonth} Kira ve Aidatını Tahakkuk Ettir
                </button>
              ) : null}
            </div>

            {monthDues.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--color-surface-ivory)', borderRadius: 'var(--radius-cards)', border: '1px dashed var(--color-hairline)' }}>
                <p style={{ margin: 0, color: 'var(--color-slate-gray)', fontSize: '13px' }}>
                  {selectedTenantMonth} dönemi için henüz kayıtlı bir Kira, Aidat veya Fatura kalemi bulunmuyor.
                </p>
                <p style={{ margin: '6px 0 0', color: 'var(--color-steel-gray)', fontSize: '12px' }}>
                  Yukarıdaki butonları kullanarak bu ay için fatura girebilir veya kira/aidat tahakkuk ettirebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tür</th>
                      <th>Detay & Açıklama</th>
                      <th>Net Tutar</th>
                      <th>Ödenen</th>
                      <th>Kalan Borç</th>
                      <th>Vade</th>
                      <th>Durum</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthDues.map((dueItem) => (
                      <tr key={dueItem.id}>
                        <td>{renderDueTypeBadge(dueItem.dueType)}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{dueItem.description || `${dueItem.period} ${translateDueType(dueItem.dueType)}`}</div>
                          {dueItem.dueType === 'FATURA' && (dueItem.electricityAmount || dueItem.waterAmount || dueItem.gasAmount) ? (
                            <div className="utility-breakdown">
                              {dueItem.electricityAmount ? <span className="utility-pill">Elk: {formatCurrency(dueItem.electricityAmount)}</span> : null}
                              {dueItem.waterAmount ? <span className="utility-pill">Su: {formatCurrency(dueItem.waterAmount)}</span> : null}
                              {dueItem.gasAmount ? <span className="utility-pill">Gaz: {formatCurrency(dueItem.gasAmount)}</span> : null}
                              {dueItem.billSupportAmount ? <span className="utility-pill support">Destek: -{formatCurrency(dueItem.billSupportAmount)}</span> : null}
                            </div>
                          ) : null}
                        </td>
                        <td><strong>{formatCurrency(dueItem.amount)}</strong></td>
                        <td>{formatCurrency(dueItem.totalPaid)}</td>
                        <td>
                          <strong style={{ color: dueItem.remainingAmount > 0 ? '#cf1322' : 'var(--color-forest)' }}>
                            {formatCurrency(dueItem.remainingAmount)}
                          </strong>
                        </td>
                        <td>{formatDate(dueItem.dueDate)}</td>
                        <td><StatusPill value={dueItem.status} /></td>
                        <td>
                          {dueItem.remainingAmount > 0 ? (
                            <button
                              type="button"
                              className="btn-mark-paid"
                              onClick={() => openPaymentConfirm(dueItem, tenant)}
                            >
                              Ödendi İşaretle
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--color-forest)', fontWeight: 600 }}>Tahsil Edildi</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '12px', padding: '12px 16px', background: 'var(--color-surface-ivory)', borderRadius: 'var(--radius-cards)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-slate-gray)' }}>
                    {selectedTenantMonth} Dönemi Toplam Net Borç:
                  </span>
                  <strong style={{ fontSize: '15px', color: totalMonthPayable > 0 ? '#cf1322' : 'var(--color-forest)' }}>
                    {formatCurrency(totalMonthPayable)}
                  </strong>
                </div>
              </div>
            )}
          </div>

          <div className="panel detail-panel" style={{ marginTop: '16px' }}>
            <div className="panel-header"><h3>Bağlı Daire</h3></div>
            <div className="detail-data-list">
              <div><span>Daire</span><strong>{tenantApartment?.apartmentNumber ?? '—'}</strong></div>
              <div><span>Blok</span><strong>{tenantApartment ? getBlockName(tenantApartment.blockId) : '—'}</strong></div>
            </div>
            {tenantApartment ? (
              <div className="modal-actions detail-actions">
                <button type="button" className="primary-button small" onClick={() => void openDetailModal('apartments', tenantApartment)}>
                  Daire detayına git
                </button>
              </div>
            ) : null}
          </div>
          {renderDocumentSection()}
        </div>
      )
    }

    const due = detailRecord as unknown as Due
    const duePayments = data.payments.filter((item) => item.dueId === due.id)

    return (
      <div className="detail-layout">
        <div className="detail-summary-grid">
          <div className="detail-stat"><span>Daire</span><strong>{getApartmentLabel(due.apartmentId)}</strong></div>
          <div className="detail-stat"><span>Site</span><strong>{getSiteNameFromApartmentId(due.apartmentId)}</strong></div>
          <div className="detail-stat"><span>Kalan bakiye</span><strong>{formatCurrency(due.remainingAmount)}</strong></div>
          <div className="detail-stat"><span>Gecikme</span><strong>{due.isOverdue ? `${due.daysOverdue} gün` : 'Yok'}</strong></div>
        </div>
        <div className="detail-card-grid">
          <div className="panel detail-panel">
            <div className="panel-header"><h3>Tahsilat özeti</h3></div>
            <div className="detail-data-list">
              <div><span>Dönem</span><strong>{due.period}</strong></div>
              <div><span>Tutar</span><strong>{formatCurrency(due.amount)}</strong></div>
              <div><span>Tahsil edilen</span><strong>{formatCurrency(due.totalPaid)}</strong></div>
              <div><span>Durum</span><strong>{translateStatus(due.status)}</strong></div>
            </div>
          </div>
          <div className="panel detail-panel">
            <div className="panel-header"><h3>Ödeme hareketleri</h3></div>
            {duePayments.length ? (
              <div className="list-stack">
                {duePayments.map((payment) => (
                  <div className="list-item compact" key={payment.id}>
                    <strong>{formatDate(payment.paymentDate)}</strong>
                    <span>{formatCurrency(payment.amountPaid)} • {payment.paymentMethod}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">Bu aidat için ödeme kaydı bulunmuyor.</div>
            )}
          </div>
        </div>
        <div className="panel detail-panel">
          <div className="panel-header"><h3>Bağlı daire</h3></div>
          <div className="detail-data-list">
            <div><span>Daire</span><strong>{getApartmentLabel(due.apartmentId)}</strong></div>
            <div><span>Site</span><strong>{getSiteNameFromApartmentId(due.apartmentId)}</strong></div>
          </div>
        </div>
        {renderDocumentSection()}
      </div>
    )
  }

  const tabContent = {
    overview: renderOverview(),
    sites: renderSites(),
    blocks: renderBlocks(),
    apartments: renderApartments(),
    owners: renderOwners(),
    tenants: renderTenants(),
    finance: renderFinance(),
    announcements: renderAnnouncements(),
    tickets: renderTickets(),
    audit: renderAudit(),
  }[activeTab]

  const modalConfig = crudModal ? CRUD_CONFIG[crudModal.entity] : null
  const activeTabLabel = TAB_LABELS[activeTab]

  if (!session) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-header">
            <span className="eyebrow">Site Yönetimi</span>
            <h1>Gayrimenkul operasyon paneli</h1>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              <span>E-posta</span>
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="admin@site.com"
              />
            </label>

            <label>
              <span>Şifre</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="Şifrenizi girin"
              />
            </label>

            {loginError ? <div className="alert">{loginError}</div> : null}

            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Yükleniyor...' : 'Giriş yap'}
            </button>

            <div className="helper-row">
              <small>Demo bilgileri</small>
              <small>{DEFAULT_CREDENTIALS.email} / {DEFAULT_CREDENTIALS.password}</small>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div>
          <div className="brand-block">
            <div className="brand-mark">SM</div>
            <div>
              <strong>Site Yönetimi</strong>
              <small>Operasyon Paneli</small>
            </div>
          </div>

          <nav className="nav">
            {NAV_GROUPS.map((group) => (
              <div key={group.title} style={{ marginBottom: '10px' }}>
                {group.title ? <div className="nav-section-title">{group.title}</div> : null}
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={activeTab === item.key ? 'nav-item active' : 'nav-item'}
                    onClick={() => setActiveTab(item.key)}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-box">
            <div className="user-info-text">
              <strong>{session.email}</strong>
              <small>{session.role === 'ADMIN' ? 'Sistem Yöneticisi' : session.role}</small>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="ghost-button small"
              title="Çıkış Yap"
              style={{ padding: '5px 12px', fontSize: '12px' }}
            >
              Çıkış
            </button>
          </div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">Yönetim Paneli</span>
            <h2>{activeTabLabel}</h2>
            <p>Tüm site operasyonlarını, sakinleri, kiraları, faturaları ve giderleri yönetin.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="type-badge type-aidat" style={{ background: 'var(--color-forest-light)', color: 'var(--color-forest)', borderColor: '#c3e6d1', padding: '6px 14px', fontSize: '12px' }}>
              Sistem Çevrimiçi
            </span>
          </div>
        </header>

        {renderDetailTrail()}

        {notice ? <div className={`alert page-alert ${notice.type}`}>{notice.text}</div> : null}
        {loginError ? <div className="alert page-alert">{loginError}</div> : null}
        {loading ? renderLoadingState() : tabContent}
      </main>

      {crudModal && modalConfig ? (
        <div className="modal-backdrop" onClick={() => setCrudModal(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{crudModal.mode === 'create' ? `${modalConfig.title} oluştur` : `${modalConfig.title} düzenle`}</h3>
              <button type="button" className="ghost-button" onClick={() => setCrudModal(null)}>
                Kapat
              </button>
            </div>

            <form ref={crudFormRef} className="modal-form" onSubmit={handleSaveModal}>
              <div className="form-grid">
                {modalConfig.fields.map((field) => {
                  const value = editForm[field.key] ?? ''

                  if (field.type === 'checkbox') {
                    return (
                      <label className="checkbox-field" key={field.key}>
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(event) => updateField(field.key, event.target.checked)}
                        />
                        <div>
                          <span>{field.label}</span>
                          {field.helpText ? <small className="field-help">{field.helpText}</small> : null}
                        </div>
                      </label>
                    )
                  }

                  if (field.type === 'select') {
                    const options = field.selectOptions?.(data) ?? [
                      { value: 'PENDING', label: 'Beklemede' },
                      { value: 'PAID', label: 'Ödendi' },
                      { value: 'OVERDUE', label: 'Gecikmiş' },
                    ]

                    return (
                      <label key={field.key} className="field">
                        <span>{field.label}</span>
                        <select
                          value={String(value)}
                          required={Boolean(field.required)}
                          onChange={(event) => updateField(field.key, event.target.value)}
                        >
                          {field.placeholder ? <option value="">{field.placeholder}</option> : null}
                          {options.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {field.helpText ? <small className="field-help">{field.helpText}</small> : null}
                      </label>
                    )
                  }

                  return (
                    <label key={field.key} className="field">
                      <span>{field.label}</span>
                      <input
                        type={field.type ?? 'text'}
                        value={String(value)}
                        required={Boolean(field.required)}
                        onChange={(event) => updateField(field.key, field.type === 'number' ? Number(event.target.value) : event.target.value)}
                      />
                      {field.helpText ? <small className="field-help">{field.helpText}</small> : null}
                    </label>
                  )
                })}
              </div>

              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={() => setCrudModal(null)}>
                  İptal
                </button>
                <button type="button" className="primary-button" onClick={() => crudFormRef.current?.requestSubmit()}>
                  {crudModal.mode === 'create' ? 'Oluştur' : 'Değişiklikleri kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {detailModal ? (
        <div className="modal-backdrop" onClick={() => setDetailModal(null)}>
          <div className="modal-card detail-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Detay görünümü</h3>
              <button type="button" className="ghost-button" onClick={() => setDetailModal(null)}>
                Kapat
              </button>
            </div>
            {renderDetailContent()}
          </div>
        </div>
      ) : null}

      {/* Ödeme Onay Modalı */}
      {paymentConfirmModal ? (
        <div className="modal-backdrop" onClick={() => !processingAction && setPaymentConfirmModal(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>💳 Tahsilat & Ödeme Onayı</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                  {paymentConfirmModal.tenant ? `${paymentConfirmModal.tenant.fullName} • ` : ''}
                  Daire {getApartmentLabel(paymentConfirmModal.due.apartmentId)}
                </p>
              </div>
              <button
                type="button"
                className="ghost-button"
                disabled={processingAction}
                onClick={() => setPaymentConfirmModal(null)}
              >
                Kapat
              </button>
            </div>

            <div style={{ padding: '4px 0' }}>
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Kalem Türü:</span>
                  <strong>{renderDueTypeBadge(paymentConfirmModal.due.dueType)} ({paymentConfirmModal.due.period})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Açıklama:</span>
                  <span style={{ fontSize: '13px' }}>{paymentConfirmModal.due.description || `${paymentConfirmModal.due.period} ${translateDueType(paymentConfirmModal.due.dueType)}`}</span>
                </div>
                {paymentConfirmModal.due.dueType === 'FATURA' && (paymentConfirmModal.due.electricityAmount || paymentConfirmModal.due.waterAmount || paymentConfirmModal.due.gasAmount) ? (
                  <div style={{ fontSize: '12px', color: 'var(--muted-2)', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #cbd5e1' }}>
                    Brüt: {formatCurrency(paymentConfirmModal.due.grossAmount ?? paymentConfirmModal.due.amount)} - Fatura Desteği: {formatCurrency(paymentConfirmModal.due.billSupportAmount ?? 0)}
                  </div>
                ) : null}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #e2e8f0', fontSize: '15px' }}>
                  <span>Kalan Borç Tutarı:</span>
                  <strong style={{ color: '#b91c1c' }}>{formatCurrency(paymentConfirmModal.due.remainingAmount)}</strong>
                </div>
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: '14px' }}>
                <label className="field">
                  <span>Ödenecek / Tahsil Edilecek Tutar (₺)</span>
                  <input
                    type="number"
                    value={paymentConfirmModal.amount}
                    min={1}
                    max={paymentConfirmModal.due.remainingAmount > 0 ? paymentConfirmModal.due.remainingAmount : paymentConfirmModal.due.amount}
                    onChange={(e) => setPaymentConfirmModal({ ...paymentConfirmModal, amount: Number(e.target.value) })}
                    required
                  />
                  <small className="field-help">Varsayılan olarak kalan tam borç tutarı gelir. Kısmi ödeme için değiştirebilirsiniz.</small>
                </label>

                <label className="field">
                  <span>Ödeme Yöntemi</span>
                  <select
                    value={paymentConfirmModal.paymentMethod}
                    onChange={(e) => setPaymentConfirmModal({ ...paymentConfirmModal, paymentMethod: e.target.value })}
                  >
                    <option value="Banka Havalesi / EFT">Banka Havalesi / EFT</option>
                    <option value="Kredi Kartı">Kredi Kartı</option>
                    <option value="Nakit">Nakit</option>
                    <option value="Otomatik Ödeme">Otomatik Ödeme</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </label>

                <label className="field">
                  <span>Ödeme / Tahsilat Tarihi</span>
                  <input
                    type="date"
                    value={paymentConfirmModal.paymentDate}
                    onChange={(e) => setPaymentConfirmModal({ ...paymentConfirmModal, paymentDate: e.target.value })}
                    required
                  />
                </label>
              </div>

              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={processingAction}
                  onClick={() => setPaymentConfirmModal(null)}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  className="primary-button"
                  style={{ background: 'var(--color-forest)' }}
                  disabled={processingAction || paymentConfirmModal.amount <= 0}
                  onClick={() => void handleConfirmPayment()}
                >
                  {processingAction ? 'Kaydediliyor...' : `${formatCurrency(paymentConfirmModal.amount)} Tahsilatı Onayla`}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Fatura Girişi & Hesaplayıcı Modalı */}
      {billModal ? (
        <div className="modal-backdrop" onClick={() => !processingAction && setBillModal(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Fatura Girişi ve Destek Hesaplayıcı</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-slate-gray)' }}>
                  {billModal.tenant.fullName} • Daire {getApartmentLabel(billModal.tenant.apartmentId)}
                </p>
              </div>
              <button
                type="button"
                className="ghost-button"
                disabled={processingAction}
                onClick={() => setBillModal(null)}
              >
                Kapat
              </button>
            </div>

            <div style={{ padding: '4px 0' }}>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <label className="field">
                  <span>Dönem (Ay)</span>
                  <input
                    type="month"
                    value={billModal.period}
                    onChange={(e) => setBillModal({ ...billModal, period: e.target.value })}
                    required
                  />
                </label>

                <label className="field">
                  <span>Son Ödeme Tarihi</span>
                  <input
                    type="date"
                    value={billModal.dueDate}
                    onChange={(e) => setBillModal({ ...billModal, dueDate: e.target.value })}
                    required
                  />
                </label>

                <label className="field">
                  <span>Elektrik Faturası (₺)</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={billModal.electricity || ''}
                    onChange={(e) => setBillModal({ ...billModal, electricity: Number(e.target.value) })}
                  />
                </label>

                <label className="field">
                  <span>Su Faturası (₺)</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={billModal.water || ''}
                    onChange={(e) => setBillModal({ ...billModal, water: Number(e.target.value) })}
                  />
                </label>

                <label className="field">
                  <span>Doğalgaz Faturası (₺)</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={billModal.gas || ''}
                    onChange={(e) => setBillModal({ ...billModal, gas: Number(e.target.value) })}
                  />
                </label>

                <label className="field">
                  <span>Fatura Desteği / İndirimi (₺)</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={billModal.support || ''}
                    onChange={(e) => setBillModal({ ...billModal, support: Number(e.target.value) })}
                  />
                  <small className="field-help">Site/yönetim desteği toplam faturadan düşülür.</small>
                </label>
              </div>

              {/* Canlı Hesaplama Kutusu */}
              {(() => {
                const gross = Number(billModal.electricity || 0) + Number(billModal.water || 0) + Number(billModal.gas || 0)
                const net = Math.max(0, gross - Number(billModal.support || 0))
                return (
                  <div className="live-calc-box">
                    <div className="live-calc-row">
                      <span>Elektrik + Su + Doğalgaz Toplamı:</span>
                      <strong>{formatCurrency(gross)}</strong>
                    </div>
                    <div className="live-calc-row">
                      <span>Uygulanan Fatura Desteği:</span>
                      <strong style={{ color: 'var(--color-forest)' }}>-{formatCurrency(billModal.support || 0)}</strong>
                    </div>
                    <div className="live-calc-row total">
                      <span>Kiracıdan Alınacak Net Fatura:</span>
                      <span className="highlight">{formatCurrency(net)}</span>
                    </div>
                  </div>
                )
              })()}

              <label className="field" style={{ marginTop: '8px' }}>
                <span>Açıklama (Opsiyonel)</span>
                <input
                  type="text"
                  value={billModal.description}
                  placeholder="Örn. Ağustos Ayı Elektrik, Su, Doğalgaz"
                  onChange={(e) => setBillModal({ ...billModal, description: e.target.value })}
                />
              </label>

              <div className="modal-actions" style={{ marginTop: '18px' }}>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={processingAction}
                  onClick={() => setBillModal(null)}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={processingAction}
                  onClick={() => void handleSaveBill()}
                >
                  {processingAction ? 'Kaydediliyor...' : 'Faturayı Kaydet ve Tahakkuk Ettir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 🚀 Yüzen Toplu İşlem Çubuğu (Floating Bulk Bar) */}
      {selectedApartmentIds.size > 0 && (
        <div className="floating-bulk-bar">
          <div className="floating-bulk-info">
            <strong>{selectedApartmentIds.size} daire seçildi</strong>
            <span>Seçili dairelere tek tıkla toplu tahakkuk yansıtın</span>
          </div>
          <div className="floating-bulk-actions">
            <button
              type="button"
              className="primary-button small"
              onClick={() => openBulkDueModal('selected')}
            >
              ⚡ Seçili Dairelere Tahakkuk Oluştur ({selectedApartmentIds.size})
            </button>
            <button
              type="button"
              className="ghost-button small"
              onClick={() => setSelectedApartmentIds(new Set())}
            >
              Seçimi Temizle
            </button>
          </div>
        </div>
      )}

      {/* ⚡ Toplu Tahakkuk Sihirbazı Modalı */}
      {bulkDueModal && (
        <div className="modal-backdrop" onClick={() => setBulkDueModal(null)}>
          <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div>
                <h3>⚡ Toplu Tahakkuk ve Borçlandırma Sihirbazı</h3>
                <small style={{ color: 'var(--color-steel)' }}>
                  150 daireye tek tıkla aidat, kira veya fatura tahakkuk ettirin
                </small>
              </div>
              <button type="button" className="ghost-button" onClick={() => setBulkDueModal(null)}>
                Kapat
              </button>
            </div>

            <div className="modal-form">
              {/* Kapsam / Filtreleme Seçimi */}
              <div className="form-grid">
                <label className="field">
                  <span>Hedef Kapsam</span>
                  <select
                    value={bulkDueModal.scope}
                    onChange={(e) => {
                      const newScope = e.target.value as 'selected' | 'all' | 'site' | 'block'
                      let newIds: string[] = []
                      if (newScope === 'selected') {
                        newIds = Array.from(selectedApartmentIds)
                      } else if (newScope === 'site' && bulkDueModal.siteId !== 'all') {
                        const siteBlockIds = new Set(data.blocks.filter((b) => b.siteId === bulkDueModal.siteId).map((b) => b.id))
                        newIds = data.apartments.filter((a) => siteBlockIds.has(a.blockId) && a.isActive).map((a) => a.id)
                      } else if (newScope === 'block' && bulkDueModal.blockId !== 'all') {
                        newIds = data.apartments.filter((a) => a.blockId === bulkDueModal.blockId && a.isActive).map((a) => a.id)
                      } else {
                        newIds = data.apartments.filter((a) => a.isActive).map((a) => a.id)
                      }
                      setBulkDueModal({ ...bulkDueModal, scope: newScope, apartmentIds: newIds })
                    }}
                  >
                    {selectedApartmentIds.size > 0 && (
                      <option value="selected">Seçili Daireler ({selectedApartmentIds.size} daire)</option>
                    )}
                    <option value="all">Tüm Sitelerdeki Tüm Aktif Daireler ({data.apartments.filter((a) => a.isActive).length} daire)</option>
                    <option value="site">Belirli Bir Sitedeki Daireler</option>
                    <option value="block">Belirli Bir Bloktaki Daireler</option>
                  </select>
                </label>

                {bulkDueModal.scope === 'site' && (
                  <label className="field">
                    <span>Site Seçin</span>
                    <select
                      value={bulkDueModal.siteId}
                      onChange={(e) => {
                        const sid = e.target.value
                        const siteBlockIds = new Set(data.blocks.filter((b) => b.siteId === sid).map((b) => b.id))
                        const ids = data.apartments.filter((a) => siteBlockIds.has(a.blockId) && a.isActive).map((a) => a.id)
                        setBulkDueModal({ ...bulkDueModal, siteId: sid, apartmentIds: ids })
                      }}
                    >
                      <option value="all">Site seçin</option>
                      {data.sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {bulkDueModal.scope === 'block' && (
                  <label className="field">
                    <span>Blok Seçin</span>
                    <select
                      value={bulkDueModal.blockId}
                      onChange={(e) => {
                        const bid = e.target.value
                        const ids = data.apartments.filter((a) => a.blockId === bid && a.isActive).map((a) => a.id)
                        setBulkDueModal({ ...bulkDueModal, blockId: bid, apartmentIds: ids })
                      }}
                    >
                      <option value="all">Blok seçin</option>
                      {data.blocks.map((b) => {
                        const s = data.sites.find((site) => site.id === b.siteId)
                        return (
                          <option key={b.id} value={b.id}>
                            {s ? `${s.name} / ` : ''}{b.name}
                          </option>
                        )
                      })}
                    </select>
                  </label>
                )}
              </div>

              {/* Dönem, Vade ve Tahakkuk Türü */}
              <div className="form-grid" style={{ marginTop: '12px' }}>
                <label className="field">
                  <span>Dönem (Ay)</span>
                  <input
                    type="month"
                    required
                    value={bulkDueModal.period}
                    onChange={(e) => setBulkDueModal({ ...bulkDueModal, period: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Son Ödeme Tarihi</span>
                  <input
                    type="date"
                    required
                    value={bulkDueModal.dueDate}
                    onChange={(e) => setBulkDueModal({ ...bulkDueModal, dueDate: e.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Tahakkuk Türü</span>
                  <select
                    value={bulkDueModal.dueType}
                    onChange={(e) => setBulkDueModal({ ...bulkDueModal, dueType: e.target.value })}
                  >
                    <option value="AIDAT">Aidat</option>
                    <option value="KIRA">Kira</option>
                    <option value="FATURA">Fatura (Elektrik/Su/Gaz)</option>
                    <option value="DIGER">Diğer</option>
                  </select>
                </label>

                <label className="field">
                  <span>Tutar Belirleme Modu</span>
                  <select
                    value={bulkDueModal.amountMode}
                    onChange={(e) => setBulkDueModal({ ...bulkDueModal, amountMode: e.target.value as 'FIXED' | 'TENANT_DEFAULT' })}
                  >
                    <option value="FIXED">Sabit Tutar (Tümüne aynı tutar)</option>
                    <option value="TENANT_DEFAULT">Sakin / Sözleşme Profil Tutarı (Örn. 2+1: 2.000 TL, 3+1: 3.000 TL)</option>
                  </select>
                </label>
              </div>

              {bulkDueModal.amountMode === 'FIXED' && bulkDueModal.dueType !== 'FATURA' && (
                <div className="form-grid" style={{ marginTop: '12px' }}>
                  <label className="field">
                    <span>Her Daire İçin Standart Tutar (₺)</span>
                    <input
                      type="number"
                      min={1}
                      value={bulkDueModal.fixedAmount || ''}
                      placeholder="2500"
                      onChange={(e) => setBulkDueModal({ ...bulkDueModal, fixedAmount: Number(e.target.value) })}
                    />
                  </label>
                </div>
              )}

              {bulkDueModal.dueType === 'FATURA' && (
                <div className="form-grid" style={{ marginTop: '12px' }}>
                  <label className="field">
                    <span>Elektrik (₺)</span>
                    <input
                      type="number"
                      min={0}
                      value={bulkDueModal.electricityAmount || ''}
                      onChange={(e) => setBulkDueModal({ ...bulkDueModal, electricityAmount: Number(e.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>Su (₺)</span>
                    <input
                      type="number"
                      min={0}
                      value={bulkDueModal.waterAmount || ''}
                      onChange={(e) => setBulkDueModal({ ...bulkDueModal, waterAmount: Number(e.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>Doğalgaz (₺)</span>
                    <input
                      type="number"
                      min={0}
                      value={bulkDueModal.gasAmount || ''}
                      onChange={(e) => setBulkDueModal({ ...bulkDueModal, gasAmount: Number(e.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>Fatura Desteği (₺)</span>
                    <input
                      type="number"
                      min={0}
                      value={bulkDueModal.billSupportAmount || ''}
                      onChange={(e) => setBulkDueModal({ ...bulkDueModal, billSupportAmount: Number(e.target.value) })}
                    />
                  </label>
                </div>
              )}

              <label className="field" style={{ marginTop: '12px' }}>
                <span>Açıklama (Opsiyonel)</span>
                <input
                  type="text"
                  value={bulkDueModal.description}
                  placeholder={`Örn. ${bulkDueModal.period} Toplu ${translateDueType(bulkDueModal.dueType)}`}
                  onChange={(e) => setBulkDueModal({ ...bulkDueModal, description: e.target.value })}
                />
              </label>

              <label className="checkbox-field" style={{ marginTop: '12px' }}>
                <input
                  type="checkbox"
                  checked={bulkDueModal.skipDuplicates}
                  onChange={(e) => setBulkDueModal({ ...bulkDueModal, skipDuplicates: e.target.checked })}
                />
                <div>
                  <span>Daha önce tahakkuk oluşturulmuş daireleri atla (Mükerrer kaydı önle)</span>
                  <small className="field-help">Bu dönemde aynı türde borcu olan dairelere tekrar tahakkuk yazılmaz.</small>
                </div>
              </label>

              {/* Canlı Hesaplama & Özet */}
              {(() => {
                const targetCount = bulkDueModal.apartmentIds.length
                let estTotal = 0
                if (bulkDueModal.dueType === 'FATURA') {
                  const gross = Number(bulkDueModal.electricityAmount || 0) + Number(bulkDueModal.waterAmount || 0) + Number(bulkDueModal.gasAmount || 0)
                  const net = Math.max(0, gross - Number(bulkDueModal.billSupportAmount || 0))
                  estTotal = net * targetCount
                } else if (bulkDueModal.amountMode === 'FIXED') {
                  estTotal = Number(bulkDueModal.fixedAmount || 0) * targetCount
                } else {
                  const aptSet = new Set(bulkDueModal.apartmentIds)
                  data.tenants.filter((t) => aptSet.has(t.apartmentId) && t.isActive).forEach((t) => {
                    estTotal += Number(bulkDueModal.dueType === 'KIRA' ? (t.monthlyRent || bulkDueModal.fixedAmount || 0) : (t.monthlyDue || bulkDueModal.fixedAmount || 0))
                  })
                }

                return (
                  <div className="bulk-summary-box">
                    <div className="bulk-summary-row">
                      <span>Hedef Daire Sayısı:</span>
                      <strong>{targetCount} Daire</strong>
                    </div>
                    <div className="bulk-summary-row">
                      <span>Tahakkuk Dönemi:</span>
                      <strong>{bulkDueModal.period} ({translateDueType(bulkDueModal.dueType)})</strong>
                    </div>
                    <div className="bulk-summary-row total">
                      <span>Tahmini Toplam Tahakkuk Tutarı:</span>
                      <strong>{formatCurrency(estTotal)}</strong>
                    </div>
                  </div>
                )
              })()}

              <div className="modal-actions" style={{ marginTop: '18px' }}>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={processingAction}
                  onClick={() => setBulkDueModal(null)}
                >
                  İptal
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={processingAction || bulkDueModal.apartmentIds.length === 0}
                  onClick={() => void handleExecuteBulkDues()}
                >
                  {processingAction ? 'Tahakkuklar Oluşturuluyor...' : `⚡ ${bulkDueModal.apartmentIds.length} Daireye Tahakkuk Oluştur`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📥 Excel / CSV Toplu İçe Aktarma Modalı */}
      {bulkImportModal && (
        <div className="modal-backdrop" onClick={() => setBulkImportModal(null)}>
          <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div>
                <h3>📥 Excel / CSV ile Toplu Tahakkuk & Sayaç İçe Aktarma</h3>
                <small style={{ color: 'var(--color-steel)' }}>
                  Excel veya CSV dosyanızdaki sayaç ve tahakkuk kayıtlarını tek seferde sisteme yükleyin
                </small>
              </div>
              <button type="button" className="ghost-button" onClick={() => setBulkImportModal(null)}>
                Kapat
              </button>
            </div>

            <div className="modal-form">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-steel)' }}>
                  Henüz şablonunuz yok mu? Hazır şablonu indirin:
                </span>
                <button
                  type="button"
                  className="btn-quick-action"
                  onClick={handleDownloadImportTemplate}
                >
                  📄 Örnek CSV Şablonunu İndir
                </button>
              </div>

              {/* Dosya Yükleme veya Metin Yapıştırma */}
              <div
                className="import-dropzone"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = '.csv, text/csv'
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = (evt) => {
                        const content = evt.target?.result as string
                        if (content) {
                          handleCsvTextChange(content)
                        }
                      }
                      reader.readAsText(file)
                    }
                  }
                  input.click()
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>📁</div>
                <strong>CSV Dosyası Seçmek İçin Tıklayın</strong>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--color-steel)' }}>
                  veya aşağıya CSV içeriğini doğrudan yapıştırın
                </p>
              </div>

              <label className="field">
                <span>CSV Verisi (Kopyala / Yapıştır)</span>
                <textarea
                  rows={4}
                  placeholder={`SiteAdı,BlokAdı,DaireNo,Dönem,Tür,Tutar,Elektrik,Su,Doğalgaz,Destek,VadeTarihi,Açıklama\nGüneş Sitesi,A Blok,1,2026-04,AIDAT,2500,,,,2026-04-15,Nisan Aidatı\nGüneş Sitesi,A Blok,2,2026-04,FATURA,,650,300,450,500,2026-04-15,Nisan Faturası`}
                  value={bulkImportModal.rawCsvText}
                  onChange={(e) => handleCsvTextChange(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '12px', padding: '10px' }}
                />
              </label>

              {/* Önizleme Tablosu */}
              {bulkImportModal.parsedRows.length > 0 ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
                      Önizleme ({bulkImportModal.parsedRows.length} satır ayrıştırıldı)
                    </h4>
                  </div>
                  <div className="import-preview-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Site / Blok</th>
                          <th>Daire</th>
                          <th>Tür</th>
                          <th>Dönem</th>
                          <th>Brüt / Sayaçlar</th>
                          <th>Destek</th>
                          <th>Net Tutar</th>
                          <th>Vade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkImportModal.parsedRows.map((row, idx) => {
                          const gross = (row.electricityAmount || 0) + (row.waterAmount || 0) + (row.gasAmount || 0)
                          const net = row.dueType === 'FATURA' && gross > 0
                            ? Math.max(0, gross - (row.billSupportAmount || 0))
                            : row.amount || 0
                          return (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>{[row.siteName, row.blockName].filter(Boolean).join(' / ') || '—'}</td>
                              <td><strong>Daire {row.apartmentNumber}</strong></td>
                              <td><span className="badge muted">{row.dueType}</span></td>
                              <td>{row.period}</td>
                              <td>
                                {gross > 0 ? (
                                  <span title={`Elk: ${row.electricityAmount || 0}, Su: ${row.waterAmount || 0}, Gaz: ${row.gasAmount || 0}`}>
                                    {formatCurrency(gross)} (Elk/Su/Gaz)
                                  </span>
                                ) : (
                                  formatCurrency(row.amount || 0)
                                )}
                              </td>
                              <td style={{ color: '#166534' }}>
                                {row.billSupportAmount ? `-${formatCurrency(row.billSupportAmount)}` : '—'}
                              </td>
                              <td><strong>{formatCurrency(net)}</strong></td>
                              <td>{row.dueDate}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="modal-actions" style={{ marginTop: '18px' }}>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={processingAction}
                  onClick={() => setBulkImportModal(null)}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={processingAction || bulkImportModal.parsedRows.length === 0}
                  onClick={() => void handleExecuteBulkImport()}
                >
                  {processingAction ? 'İçe Aktarılıyor...' : `📥 ${bulkImportModal.parsedRows.length} Satırı Sisteme Yükle`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

