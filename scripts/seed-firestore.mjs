// Firestore Otomatik Veritabanı Oluşturma ve Tohumlama Scripti (Seed Script)
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import fs from 'fs'
import path from 'path'

const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json')

let db

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
  initializeApp({
    credential: cert(serviceAccount)
  })
  db = getFirestore()
  console.log('✅ Service account ile Firebase Admin bağlandı.')
} else if (process.env.FIREBASE_PROJECT_ID) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID
  })
  db = getFirestore()
  console.log(`✅ Project ID (${process.env.FIREBASE_PROJECT_ID}) ile Firebase bağlandı.`)
} else {
  console.log(`
⚠️ Firebase bağlantı anahtarı bulunamadı!
Lütfen Firebase Console'dan (Proje Ayarları > Hizmet Hesapları) indirdiğiniz
'serviceAccountKey.json' dosyasını proje ana dizinine koyun veya
FIREBASE_PROJECT_ID ortam değişkenini tanımlayın.
  `)
  process.exit(1)
}

const SEED_DATA = {
  sites: [
    {
      id: 'site-01',
      name: 'Güneş Park Evleri',
      address: 'Atatürk Mah. Karanfil Sok. No: 12, Çankaya / Ankara',
      phone: '0312 444 0 123',
      email: 'yonetim@gunespark.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'site-02',
      name: 'Mavişehir Konakları',
      address: 'Mavişehir Mah. Sahil Bulvarı No: 45, Karşıyaka / İzmir',
      phone: '0232 333 44 55',
      email: 'bilgi@mavisehir.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  blocks: [
    { id: 'block-01', siteId: 'site-01', name: 'A Blok', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'block-02', siteId: 'site-01', name: 'B Blok', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'block-03', siteId: 'site-02', name: 'Manzara Blok', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ],
  apartments: [
    { id: 'apt-01', blockId: 'block-01', ownerId: 'user-resident-01', residentId: 'user-resident-01', apartmentNumber: 'D:1', floor: 1, apartmentType: '3+1', tapuNumber: 'TP-109283', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'apt-02', blockId: 'block-01', ownerId: 'user-resident-02', residentId: null, apartmentNumber: 'D:2', floor: 1, apartmentType: '2+1', tapuNumber: 'TP-109284', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'apt-03', blockId: 'block-02', ownerId: 'user-resident-02', residentId: null, apartmentNumber: 'D:5', floor: 3, apartmentType: '4+1', tapuNumber: 'TP-209112', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'apt-04', blockId: 'block-03', ownerId: null, residentId: null, apartmentNumber: 'D:12', floor: 6, apartmentType: '3+1 Dubleks', tapuNumber: 'TP-301145', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ],
  users: [
    { id: 'user-admin-01', email: 'admin@site.com', fullName: 'Yönetici Admin', phone: '05551112233', role: 'ADMIN', isActive: true, createdAt: new Date().toISOString() },
    { id: 'user-manager-01', email: 'manager@site.com', fullName: 'Site Müdürü Kemal', phone: '05552223344', role: 'MANAGER', isActive: true, createdAt: new Date().toISOString() },
    { id: 'user-resident-01', email: 'ahmet@site.com', fullName: 'Ahmet Yılmaz', phone: '05321112233', role: 'RESIDENT', isActive: true, createdAt: new Date().toISOString() },
    { id: 'user-resident-02', email: 'ayse@site.com', fullName: 'Ayşe Demir', phone: '05332223344', role: 'RESIDENT', isActive: true, createdAt: new Date().toISOString() }
  ],
  owners: [
    { id: 'owner-01', apartmentId: 'apt-01', fullName: 'Ahmet Yılmaz', phone: '05321112233', email: 'ahmet@site.com', idNumber: '12345678901', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'owner-02', apartmentId: 'apt-02', fullName: 'Ayşe Demir', phone: '05332223344', email: 'ayse@site.com', idNumber: '98765432109', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'owner-03', apartmentId: 'apt-03', fullName: 'Mehmet Kaya', phone: '05445556677', email: 'mehmet.kaya@email.com', idNumber: '55443322110', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ],
  tenants: [
    { id: 'tenant-01', apartmentId: 'apt-02', fullName: 'Canberk Özkan', phone: '05051234567', email: 'canberk@gmail.com', idNumber: '22334455667', moveInDate: '2025-01-15T00:00:00.000Z', moveOutDate: null, monthlyRent: 24000, monthlyDue: 2500, defaultBillSupport: 2500, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'tenant-02', apartmentId: 'apt-03', fullName: 'Zeynep Yıldız', phone: '05067890123', email: 'zeynep.yildiz@gmail.com', idNumber: '88776655443', moveInDate: '2024-06-01T00:00:00.000Z', moveOutDate: null, monthlyRent: 30000, monthlyDue: 3200, defaultBillSupport: 1500, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ],
  dues: [
    { id: 'due-01', apartmentId: 'apt-01', tenantId: null, dueType: 'AIDAT', amount: 2500, period: '2026-08', dueDate: '2026-08-15T00:00:00.000Z', status: 'PAID', grossAmount: 2500, description: 'Ağustos Ayı Genel Aidat', totalPaid: 2500, remainingAmount: 0, isOverdue: false, daysOverdue: 0 },
    { id: 'due-02', apartmentId: 'apt-02', tenantId: 'tenant-01', dueType: 'AIDAT', amount: 2500, period: '2026-08', dueDate: '2026-08-15T00:00:00.000Z', status: 'PAID', grossAmount: 2500, description: 'Ağustos Ayı Aidat Bedeli', totalPaid: 2500, remainingAmount: 0, isOverdue: false, daysOverdue: 0 },
    { id: 'due-03', apartmentId: 'apt-03', tenantId: 'tenant-02', dueType: 'AIDAT', amount: 3200, period: '2026-08', dueDate: '2026-08-10T00:00:00.000Z', status: 'PENDING', grossAmount: 3200, description: 'Ağustos Ayı Aidat Bedeli', totalPaid: 1000, remainingAmount: 2200, isOverdue: true, daysOverdue: 15 }
  ],
  payments: [
    { id: 'payment-01', dueId: 'due-01', amountPaid: 2500, paymentDate: '2026-08-12T14:30:00.000Z', paymentMethod: 'Kredi Kartı (Online)' },
    { id: 'payment-02', dueId: 'due-02', amountPaid: 2500, paymentDate: '2026-08-14T11:00:00.000Z', paymentMethod: 'Havale / EFT' }
  ],
  expenses: [
    { id: 'expense-01', title: 'Asansör Periyodik Bakım', amount: 8500, category: 'Bakım & Onarım', expenseDate: '2026-08-08T09:00:00.000Z', invoiceUrl: 'FAT-2026-01' },
    { id: 'expense-02', title: 'Ortak Alan Elektrik Faturası', amount: 14200, category: 'Elektrik & Su Ortak Alan', expenseDate: '2026-08-11T10:00:00.000Z', invoiceUrl: 'ENR-2026-02' }
  ],
  announcements: [
    { id: 'ann-01', title: 'Olağan Genel Kurul Toplantısı', content: 'Değerli site sakinlerimiz, 30 Ağustos Pazar günü saat 14:00’te Site Sosyal Tesisinde genel kurul toplantımız yapılacaktır.', createdBy: 'user-admin-01', createdAt: new Date().toISOString() }
  ],
  tickets: [
    { id: 'ticket-01', userId: 'user-resident-01', title: 'A Blok Lamba Arızası', description: '1. kat lambası yanmıyor.', status: 'IN_PROGRESS', priority: 'MEDIUM', createdAt: new Date().toISOString() }
  ]
}

async function seedFirestore() {
  console.log('🚀 Firestore koleksiyonları ve verileri yükleniyor...')
  for (const [collectionName, records] of Object.entries(SEED_DATA)) {
    const batch = db.batch()
    for (const record of records) {
      const docRef = db.collection(collectionName).doc(record.id)
      batch.set(docRef, record)
    }
    await batch.commit()
    console.log(`✅ [${collectionName}] koleksiyonu oluşturuldu (${records.length} kayıt eklendi).`)
  }
  console.log('🎉 Tebrikler! Tüm Firebase Firestore veritabanınız başarıyla oluşturuldu!')
}

seedFirestore().catch(console.error)

