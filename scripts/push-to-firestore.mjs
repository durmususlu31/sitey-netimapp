// Zero-dependency Google Firestore REST API Uploader
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json')

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ serviceAccountKey.json dosyası bulunamadı!')
  process.exit(1)
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
const { project_id, private_key, client_email } = serviceAccount

console.log(`📡 Google Cloud OAuth2 ile bağlanılıyor (${project_id})...`)

// Generate JWT for Google OAuth2
function getGoogleAuthToken() {
  return new Promise((resolve, reject) => {
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'RS256', typ: 'JWT' }
    const claim = {
      iss: client_email,
      scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    }

    const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
    const unsignedToken = `${encode(header)}.${encode(claim)}`

    const signer = crypto.createSign('RSA-SHA256')
    signer.update(unsignedToken)
    const signature = signer.sign(private_key, 'base64url')
    const jwt = `${unsignedToken}.${signature}`

    fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.access_token) {
          resolve(data.access_token)
        } else {
          reject(new Error(JSON.stringify(data)))
        }
      })
      .catch(reject)
  })
}

// Convert JavaScript object to Firestore Document format
function toFirestoreFields(obj) {
  const fields = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      fields[key] = { nullValue: null }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value }
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: String(value) }
      } else {
        fields[key] = { doubleValue: value }
      }
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value }
    } else if (Array.isArray(value)) {
      fields[key] = {
        arrayValue: {
          values: value.map((v) => ({ stringValue: String(v) })),
        },
      }
    } else if (typeof value === 'object') {
      fields[key] = {
        mapValue: {
          fields: toFirestoreFields(value),
        },
      }
    }
  }
  return fields
}

const SEED_COLLECTIONS = {
  sites: [
    {
      id: 'site-01',
      name: 'Güneş Park Evleri',
      address: 'Atatürk Mah. Karanfil Sok. No: 12, Çankaya / Ankara',
      phone: '0312 444 0 123',
      email: 'yonetim@gunespark.com',
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'site-02',
      name: 'Mavişehir Konakları',
      address: 'Mavişehir Mah. Sahil Bulvarı No: 45, Karşıyaka / İzmir',
      phone: '0232 333 44 55',
      email: 'bilgi@mavisehir.com',
      createdAt: new Date(Date.now() - 50 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  blocks: [
    { id: 'block-01', siteId: 'site-01', name: 'A Blok', createdAt: new Date(Date.now() - 60 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
    { id: 'block-02', siteId: 'site-01', name: 'B Blok', createdAt: new Date(Date.now() - 60 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
    { id: 'block-03', siteId: 'site-02', name: 'Manzara Blok', createdAt: new Date(Date.now() - 50 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  ],
  apartments: [
    { id: 'apt-01', blockId: 'block-01', ownerId: 'user-resident-01', residentId: 'user-resident-01', apartmentNumber: 'D:1', floor: 1, apartmentType: '3+1', tapuNumber: 'TP-109283', isActive: true, createdAt: new Date(Date.now() - 40 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
    { id: 'apt-02', blockId: 'block-01', ownerId: 'user-resident-02', residentId: null, apartmentNumber: 'D:2', floor: 1, apartmentType: '2+1', tapuNumber: 'TP-109284', isActive: true, createdAt: new Date(Date.now() - 40 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
    { id: 'apt-03', blockId: 'block-02', ownerId: 'user-resident-02', residentId: null, apartmentNumber: 'D:5', floor: 3, apartmentType: '4+1', tapuNumber: 'TP-209112', isActive: true, createdAt: new Date(Date.now() - 35 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
    { id: 'apt-04', blockId: 'block-03', ownerId: null, residentId: null, apartmentNumber: 'D:12', floor: 6, apartmentType: '3+1 Dubleks', tapuNumber: 'TP-301145', isActive: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  ],
  owners: [
    { id: 'owner-01', apartmentId: 'apt-01', fullName: 'Ahmet Yılmaz', phone: '05321112233', email: 'ahmet@site.com', idNumber: '12345678901', isActive: true, createdAt: new Date(Date.now() - 40 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
    { id: 'owner-02', apartmentId: 'apt-02', fullName: 'Ayşe Demir', phone: '05332223344', email: 'ayse@site.com', idNumber: '98765432109', isActive: true, createdAt: new Date(Date.now() - 40 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
    { id: 'owner-03', apartmentId: 'apt-03', fullName: 'Mehmet Kaya', phone: '05445556677', email: 'mehmet.kaya@email.com', idNumber: '55443322110', isActive: true, createdAt: new Date(Date.now() - 35 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  ],
  tenants: [
    { id: 'tenant-01', apartmentId: 'apt-02', fullName: 'Canberk Özkan', phone: '05051234567', email: 'canberk@gmail.com', idNumber: '22334455667', moveInDate: '2025-01-15T00:00:00.000Z', moveOutDate: null, monthlyRent: 24000, monthlyDue: 2500, defaultBillSupport: 2500, isActive: true, createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
    { id: 'tenant-02', apartmentId: 'apt-03', fullName: 'Zeynep Yıldız', phone: '05067890123', email: 'zeynep.yildiz@gmail.com', idNumber: '88776655443', moveInDate: '2024-06-01T00:00:00.000Z', moveOutDate: null, monthlyRent: 30000, monthlyDue: 3200, defaultBillSupport: 1500, isActive: true, createdAt: new Date(Date.now() - 25 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
  ],
  users: [
    { id: 'user-admin-01', email: 'admin@site.com', fullName: 'Yönetici Admin', phone: '05551112233', role: 'ADMIN', isActive: true, createdAt: new Date().toISOString() },
    { id: 'user-manager-01', email: 'manager@site.com', fullName: 'Site Müdürü Kemal', phone: '05552223344', role: 'MANAGER', isActive: true, createdAt: new Date().toISOString() },
    { id: 'user-resident-01', email: 'ahmet@site.com', fullName: 'Ahmet Yılmaz', phone: '05321112233', role: 'RESIDENT', isActive: true, createdAt: new Date().toISOString() },
    { id: 'user-resident-02', email: 'ayse@site.com', fullName: 'Ayşe Demir', phone: '05332223344', role: 'RESIDENT', isActive: true, createdAt: new Date().toISOString() },
  ],
  dues: [
    { id: 'due-01', apartmentId: 'apt-01', tenantId: null, dueType: 'AIDAT', amount: 2500, period: '2026-08', dueDate: '2026-08-15T00:00:00.000Z', status: 'PAID', grossAmount: 2500, description: 'Ağustos Ayı Genel Aidat', totalPaid: 2500, remainingAmount: 0, isOverdue: false, daysOverdue: 0 },
    { id: 'due-02', apartmentId: 'apt-02', tenantId: 'tenant-01', dueType: 'AIDAT', amount: 2500, period: '2026-08', dueDate: '2026-08-15T00:00:00.000Z', status: 'PAID', grossAmount: 2500, description: 'Ağustos Ayı Aidat Bedeli', totalPaid: 2500, remainingAmount: 0, isOverdue: false, daysOverdue: 0 },
    { id: 'due-03', apartmentId: 'apt-03', tenantId: 'tenant-02', dueType: 'AIDAT', amount: 3200, period: '2026-08', dueDate: '2026-08-10T00:00:00.000Z', status: 'PENDING', grossAmount: 3200, description: 'Ağustos Ayı Aidat Bedeli', totalPaid: 1000, remainingAmount: 2200, isOverdue: true, daysOverdue: 15 },
    { id: 'due-04', apartmentId: 'apt-02', tenantId: 'tenant-01', dueType: 'KIRA', amount: 24000, period: '2026-08', dueDate: '2026-08-05T00:00:00.000Z', status: 'PAID', grossAmount: 24000, description: 'Ağustos Kira Bedeli', totalPaid: 24000, remainingAmount: 0, isOverdue: false, daysOverdue: 0 },
  ],
  payments: [
    { id: 'payment-01', dueId: 'due-01', amountPaid: 2500, paymentDate: '2026-08-12T14:30:00.000Z', paymentMethod: 'Kredi Kartı (Online)' },
    { id: 'payment-02', dueId: 'due-02', amountPaid: 2500, paymentDate: '2026-08-14T11:00:00.000Z', paymentMethod: 'Havale / EFT' },
    { id: 'payment-03', dueId: 'due-03', amountPaid: 1000, paymentDate: '2026-08-18T16:20:00.000Z', paymentMethod: 'Havale / EFT' },
    { id: 'payment-04', dueId: 'due-04', amountPaid: 24000, paymentDate: '2026-08-04T10:15:00.000Z', paymentMethod: 'Banka Havalesi' },
  ],
  expenses: [
    { id: 'expense-01', title: 'A ve B Blok Asansör Periyodik Bakım', amount: 8500, category: 'Bakım & Onarım', expenseDate: '2026-08-08T09:00:00.000Z', invoiceUrl: 'FAT-2026-ASAN-01' },
    { id: 'expense-02', title: 'Site Ortak Alan Aydınlatma Elektrik Faturası', amount: 14200, category: 'Elektrik & Su Ortak Alan', expenseDate: '2026-08-11T10:00:00.000Z', invoiceUrl: 'ENR-2026-08819' },
    { id: 'expense-03', title: 'Ortak Alan Temizlik Malzemeleri Alımı', amount: 3400, category: 'Temizlik', expenseDate: '2026-08-15T15:00:00.000Z', invoiceUrl: 'TMZ-99120' },
  ],
  announcements: [
    { id: 'ann-01', title: 'Aylık Olağan Kat Malikleri Toplantısı', content: 'Değerli site sakinlerimiz, 30 Ağustos Pazar günü saat 14:00’te Site Sosyal Tesisinde genel kurul toplantımız yapılacaktır.', createdBy: 'user-admin-01', createdAt: new Date().toISOString() },
    { id: 'ann-02', title: 'Su Kesintisi ve Hidrofor Bakımı Hakkında', content: '28 Ağustos Cuma günü 13:00 - 16:00 saatleri arasında hidrofor ana vanalarında yapılacak bakım nedeniyle kısa süreli su kesintisi yaşanabilir.', createdBy: 'user-manager-01', createdAt: new Date().toISOString() },
  ],
  tickets: [
    { id: 'ticket-01', userId: 'user-resident-01', title: 'A Blok 1. Kat Koridor Lambası Yanmıyor', description: 'Koridordaki sensörlü lamba arızalandı, akşamları karanlık oluyor.', status: 'IN_PROGRESS', priority: 'MEDIUM', createdAt: new Date().toISOString() },
    { id: 'ticket-02', userId: 'user-resident-02', title: 'Otopark Giriş Kumandası Tanımlama', description: 'Yeni aldığım araç için otopark bariyerine plaka tanımlaması yapılmasını rica ediyorum.', status: 'OPEN', priority: 'LOW', createdAt: new Date().toISOString() },
  ],
  propertyDocuments: [
    { id: 'doc-01', entityType: 'APARTMENT', entityId: 'apt-01', documentCategory: 'Tapu', fileName: 'tapu_d1.pdf', fileUrl: 'https://example.com/docs/tapu_d1.pdf', notes: 'Resmi kat mülkiyeti tapu fotokopisi', createdAt: new Date().toISOString() },
    { id: 'doc-02', entityType: 'TENANT', entityId: 'tenant-01', documentCategory: 'Kira Sözleşmesi', fileName: 'kira_sozlesmesi_canberk.pdf', fileUrl: 'https://example.com/docs/sozlesme.pdf', notes: '1 Yıllık noter onaylı kira kontratı', createdAt: new Date().toISOString() },
  ],
  auditLogs: [
    { id: 'audit-01', userId: 'user-admin-01', action: 'CREATE', entityName: 'Due', entityId: 'due-01', timestamp: new Date().toISOString(), details: 'Ağustos 2026 dönemi aidat tahakkuku oluşturuldu.' },
    { id: 'audit-02', userId: 'user-admin-01', action: 'PAYMENT', entityName: 'Payment', entityId: 'payment-01', timestamp: new Date().toISOString(), details: '2.500 ₺ tutarında aidat ödemesi tahsil edildi.' },
  ],
}

async function run() {
  try {
    const token = await getGoogleAuthToken()
    console.log('🔑 Google Access Token başarıyla alındı!')

    const baseUrl = `https://firestore.googleapis.com/v1/projects/${project_id}/databases/(default)/documents`

    for (const [collectionName, records] of Object.entries(SEED_COLLECTIONS)) {
      for (const record of records) {
        const docUrl = `${baseUrl}/${collectionName}/${record.id}`
        const body = {
          fields: toFirestoreFields(record),
        }

        const res = await fetch(docUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const errText = await res.text()
          console.warn(`⚠️ [${collectionName}/${record.id}] eklenirken uyarı:`, errText)
        }
      }
      console.log(`✅ [${collectionName}] koleksiyonu oluşturuldu (${records.length} kayıt aktarıldı).`)
    }

    console.log('\n🎉 TEBRİKLER! Firebase Firestore veritabanınız tüm koleksiyonlarıyla başarıyla oluşturuldu!')
  } catch (error) {
    console.error('❌ Hata oluştu:', error)
  }
}

run()

