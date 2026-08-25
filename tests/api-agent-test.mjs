process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = process.env.API_BASE_URL || 'https://localhost:7044';

// Test statistics
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  benchmarkLatencies: [],
  suites: {}
};

let currentSuite = 'Default';

function startSuite(name) {
  currentSuite = name;
  stats.suites[name] = { total: 0, passed: 0, failed: 0 };
  console.log(`\n================================================================`);
  console.log(`🔷 SUITE: ${name}`);
  console.log(`================================================================`);
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const method = options.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const startTime = performance.now();
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const duration = Math.round(performance.now() - startTime);

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    return { status: res.status, ok: res.ok, data, duration };
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    return { status: 0, ok: false, error: err.message, duration };
  }
}

async function assertTest(name, fn) {
  stats.total++;
  stats.suites[currentSuite].total++;
  const startTime = Date.now();
  try {
    await fn();
    const duration = Date.now() - startTime;
    stats.passed++;
    stats.suites[currentSuite].passed++;
    console.log(`  ✅ [PASS] ${name} (${duration}ms)`);
    return true;
  } catch (err) {
    const duration = Date.now() - startTime;
    stats.failed++;
    stats.suites[currentSuite].failed++;
    console.error(`  ❌ [FAIL] ${name} (${duration}ms)`);
    console.error(`     Error: ${err.message}`);
    return false;
  }
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runAllTests() {
  console.log(`\n🧪 STARTING SITE MANAGEMENT SYSTEM AUTOMATED TEST AGENT`);
  console.log(`🎯 Target Base URL: ${BASE_URL}\n`);

  let adminUserId = '';
  let adminToken = '';
  let refreshToken = '';
  let testSiteId = '';
  let testBlockId = '';
  let testApartmentId = '';
  let testOwnerId = '';
  let testTenantId = '';
  let testDueId = '';
  let testExpenseId = '';
  let testTicketId = '';
  let testAnnouncementId = '';
  let testDocumentId = '';

  // -------------------------------------------------------------------------
  // SUITE 1: AUTHENTICATION & TOKEN LIFECYCLE
  // -------------------------------------------------------------------------
  startSuite('1. Authentication & Token Security');

  await assertTest('1.1 - Login with valid Admin credentials', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@site.com', password: 'Admin@123' }
    });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(res.data?.success === true, 'Response success should be true');
    expect(res.data?.data?.accessToken, 'Expected accessToken in response');
    expect(res.data?.data?.refreshToken, 'Expected refreshToken in response');
    adminUserId = res.data.data.userId;
    adminToken = res.data.data.accessToken;
    refreshToken = res.data.data.refreshToken;
  });

  await assertTest('1.2 - Refresh Token Rotation', async () => {
    const res = await request('/api/auth/refresh-token', {
      method: 'POST',
      body: { refreshToken }
    });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    expect(res.data?.data?.accessToken, 'Expected new accessToken');
    expect(res.data?.data?.refreshToken, 'Expected new refreshToken');
    expect(res.data.data.refreshToken !== refreshToken, 'Refresh token should rotate');
    adminToken = res.data.data.accessToken;
    refreshToken = res.data.data.refreshToken;
  });

  await assertTest('1.3 - Logout & Token Revocation', async () => {
    const res = await request('/api/auth/logout', {
      method: 'POST',
      body: { refreshToken }
    });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    
    const reuseRes = await request('/api/auth/refresh-token', {
      method: 'POST',
      body: { refreshToken }
    });
    expect(reuseRes.status === 401 || reuseRes.status === 400, `Expected 401/400 for revoked token, got ${reuseRes.status}`);
  });

  await assertTest('1.4 - Protected endpoints return 401 without Token', async () => {
    const res = await request('/api/sites');
    expect(res.status === 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  await assertTest('1.5 - Protected endpoints return 401 with Invalid Token', async () => {
    const res = await request('/api/sites', {
      headers: { Authorization: 'Bearer invalid.token.signature' }
    });
    expect(res.status === 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  await assertTest('1.6 - Re-login for remaining test suites', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@site.com', password: 'Admin@123' }
    });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    adminUserId = res.data.data.userId;
    adminToken = res.data.data.accessToken;
  });

  const authHeader = () => ({ Authorization: `Bearer ${adminToken}` });

  // -------------------------------------------------------------------------
  // SUITE 2: CORE DOMAIN - SITE HIERARCHY
  // -------------------------------------------------------------------------
  startSuite('2. Core Site Hierarchy (Site -> Block -> Apartment)');

  const uniqueSuffix = `${Date.now().toString().slice(-4)}_${Math.floor(Math.random()*1000)}`;
  const sitePayload = {
    name: `Test Park Sitesi ${uniqueSuffix}`,
    address: 'Kadıköy, İstanbul',
    phone: '+902161112233',
    email: `testsite_${uniqueSuffix}@site.com`
  };

  await assertTest('2.1 - Create Site', async () => {
    const res = await request('/api/sites', {
      method: 'POST',
      headers: authHeader(),
      body: sitePayload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    const site = res.data?.data || res.data;
    expect(site?.id, 'Expected Site ID');
    expect(site?.name === sitePayload.name, 'Site name mismatch');
    testSiteId = site.id;
  });

  await assertTest('2.2 - Get Site by ID & List Sites', async () => {
    const getRes = await request(`/api/sites/${testSiteId}`, { headers: authHeader() });
    expect(getRes.status === 200, `Expected 200, got ${getRes.status}`);
    const listRes = await request('/api/sites', { headers: authHeader() });
    expect(listRes.status === 200, `Expected 200, got ${listRes.status}`);
    const list = listRes.data?.data || listRes.data;
    expect(Array.isArray(list), 'Expected array of sites');
    expect(list.some(s => s.id === testSiteId), 'Created site should be in the list');
  });

  await assertTest('2.3 - Update Site', async () => {
    const updatePayload = {
      ...sitePayload,
      name: `Test Park Sitesi ${uniqueSuffix} (Updated)`
    };
    const res = await request(`/api/sites/${testSiteId}`, {
      method: 'PUT',
      headers: authHeader(),
      body: updatePayload
    });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    const updated = res.data?.data || res.data;
    expect(updated?.name === updatePayload.name, 'Updated name mismatch');
  });

  await assertTest('2.4 - Create Block under Site', async () => {
    const blockPayload = {
      siteId: testSiteId,
      name: `Blok-${uniqueSuffix}`
    };
    const res = await request('/api/blocks', {
      method: 'POST',
      headers: authHeader(),
      body: blockPayload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    const block = res.data?.data || res.data;
    expect(block?.id, 'Expected Block ID');
    testBlockId = block.id;
  });

  await assertTest('2.5 - Create Apartment under Block', async () => {
    const aptPayload = {
      blockId: testBlockId,
      ownerId: null,
      residentId: null,
      apartmentNumber: `D-${uniqueSuffix}`,
      floor: 3,
      apartmentType: '3+1',
      tapuNumber: `TP-${uniqueSuffix}`,
      isActive: true
    };
    const res = await request('/api/apartments', {
      method: 'POST',
      headers: authHeader(),
      body: aptPayload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    const apt = res.data?.data || res.data;
    expect(apt?.id, 'Expected Apartment ID');
    testApartmentId = apt.id;
  });

  await assertTest('2.6 - Get Apartment by ID', async () => {
    const res = await request(`/api/apartments/${testApartmentId}`, { headers: authHeader() });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    const apt = res.data?.data || res.data;
    expect(apt?.apartmentNumber === `D-${uniqueSuffix}`, 'Apartment number mismatch');
  });

  // -------------------------------------------------------------------------
  // SUITE 3: RESIDENTS (OWNER & TENANT)
  // -------------------------------------------------------------------------
  startSuite('3. Resident Management (Owner & Tenant)');

  await assertTest('3.1 - Create Owner for Apartment', async () => {
    const ownerPayload = {
      apartmentId: testApartmentId,
      fullName: 'Ahmet Yılmaz',
      phone: '+905321112233',
      email: `ahmet_${uniqueSuffix}@example.com`,
      idNumber: `123456${uniqueSuffix}`,
      isActive: true
    };
    const res = await request('/api/owners', {
      method: 'POST',
      headers: authHeader(),
      body: ownerPayload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    const owner = res.data?.data || res.data;
    expect(owner?.id, 'Expected Owner ID');
    testOwnerId = owner.id;
  });

  await assertTest('3.2 - Create Tenant for Apartment', async () => {
    const tenantPayload = {
      apartmentId: testApartmentId,
      fullName: 'Mehmet Demir',
      phone: '+905421112233',
      email: `mehmet_${uniqueSuffix}@example.com`,
      idNumber: `987654${uniqueSuffix}`,
      moveInDate: '2026-01-01T00:00:00Z',
      moveOutDate: null,
      isActive: true,
      monthlyRent: 22000.0,
      monthlyDue: 2000.0,
      defaultBillSupport: 2000.0
    };
    const res = await request('/api/tenants', {
      method: 'POST',
      headers: authHeader(),
      body: tenantPayload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    const tenant = res.data?.data || res.data;
    expect(tenant?.id, 'Expected Tenant ID');
    expect(tenant?.monthlyRent === 22000.0, 'Monthly rent mismatch');
    expect(tenant?.defaultBillSupport === 2000.0, 'Default bill support mismatch');
    testTenantId = tenant.id;
  });

  await assertTest('3.3 - List Owners and Tenants', async () => {
    const ownersRes = await request('/api/owners', { headers: authHeader() });
    expect(ownersRes.status === 200, `Expected 200 for owners, got ${ownersRes.status}`);
    const tenantsRes = await request('/api/tenants', { headers: authHeader() });
    expect(tenantsRes.status === 200, `Expected 200 for tenants, got ${tenantsRes.status}`);
  });

  // -------------------------------------------------------------------------
  // SUITE 4: FINANCIAL MANAGEMENT (DUES, RENT, UTILITY BILLS & EXPENSES)
  // -------------------------------------------------------------------------
  startSuite('4. Financial Management (Dues, Rent, Utility Bills & Expenses)');

  await assertTest('4.1 - Create Due (Aidat)', async () => {
    const duePayload = {
      apartmentId: testApartmentId,
      amount: 1500.0,
      period: '2026-08',
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
      status: 'PENDING',
      dueType: 'AIDAT'
    };
    const res = await request('/api/dues', {
      method: 'POST',
      headers: authHeader(),
      body: duePayload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    const due = res.data?.data || res.data;
    expect(due?.id, 'Expected Due ID');
    expect(due?.amount === 1500.0, 'Due amount mismatch');
    expect(due?.remainingAmount === 1500.0, 'Remaining amount should initially equal total amount');
    testDueId = due.id;
  });

  await assertTest('4.2 - Create Rent (Kira) for Same Apartment & Period', async () => {
    const rentPayload = {
      apartmentId: testApartmentId,
      tenantId: testTenantId,
      amount: 22000.0,
      period: '2026-08',
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
      status: 'PENDING',
      dueType: 'KIRA',
      description: '2026-08 Kira Bedeli'
    };
    const res = await request('/api/dues', {
      method: 'POST',
      headers: authHeader(),
      body: rentPayload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    const rent = res.data?.data || res.data;
    expect(rent?.id, 'Expected Rent ID');
    expect(rent?.amount === 22000.0, 'Rent amount mismatch');
    expect(rent?.dueType === 'KIRA', 'Expected KIRA dueType');
  });

  await assertTest('4.3 - Create Utility Bill with Subsidy Support (2500 TL Gross - 2000 TL Support = 500 TL Net)', async () => {
    const billPayload = {
      apartmentId: testApartmentId,
      tenantId: testTenantId,
      amount: 0,
      electricityAmount: 1200.0,
      waterAmount: 500.0,
      gasAmount: 800.0,
      billSupportAmount: 2000.0,
      period: '2026-08',
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
      status: 'PENDING',
      dueType: 'FATURA',
      description: '2026-08 Elektrik, Su, Doğalgaz'
    };
    const res = await request('/api/dues', {
      method: 'POST',
      headers: authHeader(),
      body: billPayload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    const bill = res.data?.data || res.data;
    expect(bill?.id, 'Expected Bill ID');
    expect(bill?.amount === 500.0, `Expected Net Amount 500.0, got ${bill?.amount}`);
    expect(bill?.grossAmount === 2500.0, `Expected Gross Amount 2500.0, got ${bill?.grossAmount}`);
    expect(bill?.billSupportAmount === 2000.0, 'Bill support amount mismatch');
  });

  await assertTest('4.4 - Record Partial Payment (500 TL)', async () => {
    const paymentPayload = {
      dueId: testDueId,
      amountPaid: 500.0,
      paymentDate: new Date().toISOString(),
      paymentMethod: 'HAVALE_EFT'
    };
    const res = await request('/api/payments', {
      method: 'POST',
      headers: authHeader(),
      body: paymentPayload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    
    const dueRes = await request(`/api/dues/${testDueId}`, { headers: authHeader() });
    const due = dueRes.data?.data || dueRes.data;
    expect(due?.totalPaid === 500.0, `Total paid should be 500, got ${due?.totalPaid}`);
    expect(due?.remainingAmount === 1000.0, `Remaining should be 1000, got ${due?.remainingAmount}`);
  });

  await assertTest('4.3 - Record Remaining Payment (1000 TL) -> Status PAID', async () => {
    const paymentPayload = {
      dueId: testDueId,
      amountPaid: 1000.0,
      paymentDate: new Date().toISOString(),
      paymentMethod: 'KREDI_KARTI'
    };
    const res = await request('/api/payments', {
      method: 'POST',
      headers: authHeader(),
      body: paymentPayload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    
    const dueRes = await request(`/api/dues/${testDueId}`, { headers: authHeader() });
    const due = dueRes.data?.data || dueRes.data;
    expect(due?.remainingAmount === 0, `Remaining should be 0, got ${due?.remainingAmount}`);
  });

  await assertTest('4.4 - Create Expense', async () => {
    const expensePayload = {
      title: `Asansör Bakımı ${uniqueSuffix}`,
      amount: 2750.0,
      category: 'BAKIM_ONARIM',
      expenseDate: new Date().toISOString(),
      invoiceUrl: 'https://example.com/invoice-123.pdf'
    };
    const res = await request('/api/expenses', {
      method: 'POST',
      headers: authHeader(),
      body: expensePayload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    const exp = res.data?.data || res.data;
    expect(exp?.id, 'Expected Expense ID');
    expect(exp?.amount === 2750.0, 'Expense amount mismatch');
    testExpenseId = exp.id;
  });

  await assertTest('4.5 - Bulk Create Dues for Site Apartments (100% Automation)', async () => {
    const bulkPayload = {
      siteId: testSiteId,
      period: '2026-09',
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      dueType: 'AIDAT',
      amountMode: 'FIXED',
      fixedAmount: 2500.0,
      description: '2026-09 Toplu Aidat Tahakkuku',
      skipDuplicates: true
    };
    const res = await request('/api/dues/bulk', {
      method: 'POST',
      headers: authHeader(),
      body: bulkPayload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    const bulkResult = res.data?.data || res.data;
    expect(bulkResult?.totalTargeted >= 1, `Expected targeted >= 1, got ${bulkResult?.totalTargeted}`);
    expect(bulkResult?.createdCount >= 1, `Expected created >= 1, got ${bulkResult?.createdCount}`);
  });

  await assertTest('4.6 - Bulk Create Dues with SkipDuplicates (Idempotent)', async () => {
    const bulkPayload = {
      siteId: testSiteId,
      period: '2026-09',
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      dueType: 'AIDAT',
      amountMode: 'FIXED',
      fixedAmount: 2500.0,
      skipDuplicates: true
    };
    const res = await request('/api/dues/bulk', {
      method: 'POST',
      headers: authHeader(),
      body: bulkPayload
    });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    const bulkResult = res.data?.data || res.data;
    expect(bulkResult?.createdCount === 0, `Expected created 0 on duplicate run, got ${bulkResult?.createdCount}`);
    expect(bulkResult?.skippedCount >= 1, `Expected skipped >= 1, got ${bulkResult?.skippedCount}`);
  });

  await assertTest('4.7 - Bulk Import Dues / Meter Readings (CSV Simulation)', async () => {
    const rows = [
      {
        apartmentNumber: `D-${uniqueSuffix}`,
        period: '2026-10',
        dueDate: new Date(Date.now() + 45 * 86400000).toISOString(),
        dueType: 'FATURA',
        amount: 0,
        electricityAmount: 600.0,
        waterAmount: 350.0,
        gasAmount: 450.0,
        billSupportAmount: 500.0,
        description: '2026-10 Sayaç Okuma İçe Aktarımı'
      }
    ];
    const res = await request('/api/dues/import', {
      method: 'POST',
      headers: authHeader(),
      body: rows
    });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    const importResult = res.data?.data || res.data;
    expect(importResult?.successCount >= 1, `Expected successCount >= 1, got ${importResult?.successCount}`);
  });

  // -------------------------------------------------------------------------
  // SUITE 5: SUPPORT & OPERATIONS
  // -------------------------------------------------------------------------
  startSuite('5. Support, Announcements & Property Documents');

  await assertTest('5.1 - Create Announcement', async () => {
    const payload = {
      title: `Olağan Genel Kurul Çağrısı ${uniqueSuffix}`,
      content: '2026 yılı olağan genel kurul toplantısı site lokalinde yapılacaktır.',
      createdBy: adminUserId
    };
    const res = await request('/api/announcements', {
      method: 'POST',
      headers: authHeader(),
      body: payload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    const ann = res.data?.data || res.data;
    expect(ann?.id, 'Expected Announcement ID');
    testAnnouncementId = ann.id;
  });

  await assertTest('5.2 - Create Support Ticket', async () => {
    const payload = {
      userId: adminUserId,
      title: 'Merdiven Otomatiği Arızası',
      description: '3. kat merdiven otomatiği çalışmıyor, lamba yanmıyor.',
      status: 1, // OPEN
      priority: 2 // MEDIUM
    };
    const res = await request('/api/tickets', {
      method: 'POST',
      headers: authHeader(),
      body: payload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    const ticket = res.data?.data || res.data;
    expect(ticket?.id, 'Expected Ticket ID');
    testTicketId = ticket.id;
  });

  await assertTest('5.3 - Update Ticket Status to IN_PROGRESS', async () => {
    const payload = {
      userId: adminUserId,
      title: 'Merdiven Otomatiği Arızası',
      description: 'Teknisyen yönlendirildi.',
      status: 2, // IN_PROGRESS
      priority: 2
    };
    const res = await request(`/api/tickets/${testTicketId}`, {
      method: 'PUT',
      headers: authHeader(),
      body: payload
    });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await assertTest('5.4 - Create and Retrieve Property Document', async () => {
    const docPayload = {
      entityType: 'Apartment',
      entityId: testApartmentId,
      documentCategory: 'TAPU',
      fileName: 'tapu_ornegi.pdf',
      fileUrl: 'https://storage.site.com/docs/tapu_101.pdf',
      notes: 'Noter onaylı tapu fotokopisi'
    };
    const res = await request('/api/propertydocuments', {
      method: 'POST',
      headers: authHeader(),
      body: docPayload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
    const doc = res.data?.data || res.data;
    expect(doc?.id, 'Expected Document ID');
    testDocumentId = doc.id;

    const listRes = await request(`/api/propertydocuments?entityType=Apartment&entityId=${testApartmentId}`, {
      headers: authHeader()
    });
    expect(listRes.status === 200, `Expected 200, got ${listRes.status}`);
    const docs = listRes.data?.data || listRes.data;
    expect(Array.isArray(docs), 'Expected array of documents');
    expect(docs.some(d => d.id === testDocumentId), 'Document should be in list');
  });

  await assertTest('5.5 - Delete Property Document', async () => {
    const res = await request(`/api/propertydocuments/${testDocumentId}`, {
      method: 'DELETE',
      headers: authHeader()
    });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // -------------------------------------------------------------------------
  // SUITE 6: REPORTS & AUDIT LOGS
  // -------------------------------------------------------------------------
  startSuite('6. Reporting & Audit Logging');

  await assertTest('6.1 - Get Finance Report', async () => {
    const res = await request('/api/reports/finance', { headers: authHeader() });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    const report = res.data?.data || res.data;
    expect(typeof report === 'object' && report !== null, 'Report should be an object');
    console.log(`     📊 Financial Report: Total Income=${report.totalIncome ?? 0}, Total Expense=${report.totalExpense ?? 0}, Net=${report.netBalance ?? 0}`);
  });

  await assertTest('6.2 - Create Audit Log Entry', async () => {
    const auditPayload = {
      userId: adminUserId,
      action: 'TEST_AUTOMATION_RUN',
      entityName: 'Site',
      entityId: testSiteId,
      timestamp: new Date().toISOString(),
      details: 'Audit log generated by automated Test Agent'
    };
    const res = await request('/api/auditlogs', {
      method: 'POST',
      headers: authHeader(),
      body: auditPayload
    });
    expect(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
  });

  await assertTest('6.3 - Audit Logs Record Activity', async () => {
    const res = await request('/api/auditlogs', { headers: authHeader() });
    expect(res.status === 200, `Expected 200, got ${res.status}`);
    const logs = res.data?.data || res.data;
    expect(Array.isArray(logs), 'Expected array of audit logs');
    expect(logs.length > 0, 'Audit logs should contain recorded operations');
    console.log(`     📝 Audit Logs Count: ${logs.length} entries`);
  });

  // -------------------------------------------------------------------------
  // SUITE 7: NEGATIVE TESTING & SECURITY VALIDATION
  // -------------------------------------------------------------------------
  startSuite('7. Negative Testing & Security Constraints');

  await assertTest('7.1 - Prevent duplicate Block in same Site', async () => {
    const blockPayload = {
      siteId: testSiteId,
      name: `Blok-${uniqueSuffix}` // duplicate name
    };
    const res = await request('/api/blocks', {
      method: 'POST',
      headers: authHeader(),
      body: blockPayload
    });
    expect(res.status === 400 || res.status === 409, `Expected 400/409 duplicate conflict, got ${res.status}`);
  });

  await assertTest('7.2 - Return 404 for non-existent Site ID', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(`/api/sites/${fakeId}`, { headers: authHeader() });
    expect(res.status === 404, `Expected 404 Not Found, got ${res.status}`);
  });

  await assertTest('7.3 - Reject login with incorrect password', async () => {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@site.com', password: 'WrongPassword999!' }
    });
    expect(res.status === 401 || res.status === 400, `Expected 401/400 for wrong password, got ${res.status}`);
  });

  await assertTest('7.4 - Reject invalid email format in Site creation', async () => {
    const res = await request('/api/sites', {
      method: 'POST',
      headers: authHeader(),
      body: {
        name: `Invalid Site ${Date.now()}`,
        address: 'Test Address',
        phone: '123456',
        email: 'not-an-email'
      }
    });
    expect(res.status === 400, `Expected 400 Bad Request for invalid email, got ${res.status}`);
  });

  await assertTest('7.5 - SQL Injection & Special Characters Sanitization', async () => {
    const sqlTestSuffix = `${Date.now()}_${Math.random().toString().slice(-4)}`;
    const res = await request('/api/sites', {
      method: 'POST',
      headers: authHeader(),
      body: {
        name: `Safe Site ${sqlTestSuffix} '; DROP TABLE Users; --`,
        address: "<script>alert('xss')</script>",
        phone: "+905551234567",
        email: `sql_test_${sqlTestSuffix}@site.com`
      }
    });
    expect(res.status === 200 || res.status === 201 || res.status === 400 || res.status === 409, `Expected safe status, got ${res.status}`);
    
    const usersRes = await request('/api/users', { headers: authHeader() });
    expect(usersRes.status === 200, 'Users endpoint must remain healthy');
  });

  // -------------------------------------------------------------------------
  // SUITE 8: PERFORMANCE BENCHMARK & SLA
  // -------------------------------------------------------------------------
  startSuite('8. Performance Benchmark & Latency SLA (<200ms)');

  await assertTest('8.1 - 25 High-Throughput Requests to API Endpoints', async () => {
    const endpoints = [
      '/api/sites',
      '/api/blocks',
      '/api/apartments',
      '/api/announcements',
      '/api/reports/finance'
    ];

    for (let i = 0; i < 25; i++) {
      const ep = endpoints[i % endpoints.length];
      const start = performance.now();
      const res = await request(ep, { headers: authHeader() });
      const duration = Math.round(performance.now() - start);
      stats.benchmarkLatencies.push(duration);
      expect(res.status === 200, `Endpoint ${ep} returned status ${res.status}`);
    }
  });

  // Calculate Latency Metrics on benchmark requests
  stats.benchmarkLatencies.sort((a, b) => a - b);
  const p50 = stats.benchmarkLatencies[Math.floor(stats.benchmarkLatencies.length * 0.50)] || 0;
  const p90 = stats.benchmarkLatencies[Math.floor(stats.benchmarkLatencies.length * 0.90)] || 0;
  const p95 = stats.benchmarkLatencies[Math.floor(stats.benchmarkLatencies.length * 0.95)] || 0;
  const p99 = stats.benchmarkLatencies[Math.floor(stats.benchmarkLatencies.length * 0.99)] || 0;
  const avg = (stats.benchmarkLatencies.reduce((a, b) => a + b, 0) / stats.benchmarkLatencies.length).toFixed(1);

  await assertTest('8.2 - SLA Latency Verification (P95 < 200ms)', async () => {
    console.log(`     ⚡ Benchmark Latency Metrics (${stats.benchmarkLatencies.length} requests):`);
    console.log(`        - Average: ${avg}ms`);
    console.log(`        - P50 (Median): ${p50}ms`);
    console.log(`        - P90: ${p90}ms`);
    console.log(`        - P95: ${p95}ms`);
    console.log(`        - P99: ${p99}ms`);
    expect(p95 < 200, `P95 latency (${p95}ms) exceeds SLA target of 200ms`);
  });

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log(`\n================================================================`);
  console.log(`📊 TEST AGENT EXECUTION SUMMARY`);
  console.log(`================================================================`);
  console.log(`Total Tests Run:  ${stats.total}`);
  console.log(`Passed:           ${stats.passed} ✅`);
  console.log(`Failed:           ${stats.failed} ❌`);
  console.log(`Pass Rate:        ${((stats.passed / stats.total) * 100).toFixed(1)}%`);
  console.log(`\nSuite Breakdown:`);
  for (const [suite, s] of Object.entries(stats.suites)) {
    console.log(`  - ${suite}: ${s.passed}/${s.total} passed`);
  }
  console.log(`================================================================\n`);

  if (stats.failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
