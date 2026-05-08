/* ─── PULSE Admin SPA ──────────────────────────────────────────────────────── */
const API = '/admin'
let token = localStorage.getItem('admin_token') || null
let currentAdmin = null
let currentPage = 'dashboard'

// ─── API Helper ──────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = 'Bearer ' + token
  const res = await fetch(API + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || 'Erro na requisição')
  return data
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    document.body.appendChild(container)
  }
  const el = document.createElement('div')
  el.className = 'toast toast-' + type
  el.textContent = msg
  container.appendChild(el)
  setTimeout(() => el.remove(), 3500)
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmt(val, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val || 0)
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'
}

// ─── Status Badges ────────────────────────────────────────────────────────────
const ORDER_STATUS = {
  PENDING: ['badge-yellow', 'Pendente'],
  PROCESSING: ['badge-blue', 'Processando'],
  SHIPPED: ['badge-purple', 'Enviado'],
  DELIVERED: ['badge-green', 'Entregue'],
  CANCELLED: ['badge-red', 'Cancelado'],
  REFUNDED: ['badge-gray', 'Reembolsado'],
}
const PAYMENT_STATUS = {
  AWAITING: ['badge-yellow', 'Aguardando'],
  CAPTURED: ['badge-green', 'Pago'],
  REFUNDED: ['badge-gray', 'Reembolsado'],
  CANCELLED: ['badge-red', 'Cancelado'],
}
const PRODUCT_STATUS = {
  DRAFT: ['badge-gray', 'Rascunho'],
  PUBLISHED: ['badge-green', 'Publicado'],
  ARCHIVED: ['badge-red', 'Arquivado'],
}

function badge(map, key) {
  const [cls, label] = map[key] || ['badge-gray', key]
  return `<span class="badge ${cls}">${label}</span>`
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function login(email, password) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  token = data.token
  currentAdmin = data.admin
  localStorage.setItem('admin_token', token)
  return data
}

function logout() {
  token = null
  currentAdmin = null
  localStorage.removeItem('admin_token')
  showLogin()
}

async function checkAuth() {
  if (!token) return false
  try {
    const data = await api('/auth/me')
    currentAdmin = data.admin
    return true
  } catch {
    token = null
    localStorage.removeItem('admin_token')
    return false
  }
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function navigate(page, params = {}) {
  currentPage = page
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page)
  })
  const titles = { dashboard: 'Dashboard', orders: 'Pedidos', products: 'Produtos', customers: 'Clientes' }
  document.getElementById('page-title').textContent = titles[page] || page
  document.getElementById('topbar-actions').innerHTML = ''

  const content = document.getElementById('page-content')
  content.innerHTML = '<div class="loading"><div class="spinner"></div> Carregando...</div>'

  if (page === 'dashboard') renderDashboard()
  else if (page === 'orders') renderOrders(params)
  else if (page === 'order-detail') renderOrderDetail(params.id)
  else if (page === 'products') renderProducts(params)
  else if (page === 'product-form') renderProductForm(params.id)
  else if (page === 'customers') renderCustomers(params)
  else if (page === 'customer-detail') renderCustomerDetail(params.id)
}

// ─── Screen Helpers ───────────────────────────────────────────────────────────
function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden')
  document.getElementById('dashboard-screen').classList.add('hidden')
}
function showDashboard() {
  document.getElementById('login-screen').classList.add('hidden')
  document.getElementById('dashboard-screen').classList.remove('hidden')
  if (currentAdmin) {
    document.getElementById('admin-name').textContent = currentAdmin.name || 'Admin'
    document.getElementById('admin-role').textContent = currentAdmin.role || 'ADMIN'
    document.getElementById('admin-avatar').textContent = (currentAdmin.name || 'A')[0].toUpperCase()
  }
  navigate('dashboard')
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function renderDashboard() {
  try {
    const data = await api('/dashboard')
    const { stats, recentOrders, ordersByStatus } = data
    const total = ordersByStatus.reduce((s, o) => s + o.count, 0) || 1
    const statusColors = { PENDING: '#eab308', PROCESSING: '#3b82f6', SHIPPED: '#a855f7', DELIVERED: '#22c55e', CANCELLED: '#ef4444', REFUNDED: '#666' }

    document.getElementById('page-content').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Receita Total</div>
          <div class="stat-value">${fmt(stats.revenue)}</div>
          <div class="stat-sub">pagamentos capturados</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Pedidos</div>
          <div class="stat-value">${stats.totalOrders}</div>
          <div class="stat-sub">total de pedidos</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Clientes</div>
          <div class="stat-value">${stats.totalCustomers}</div>
          <div class="stat-sub">cadastrados</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Produtos</div>
          <div class="stat-value">${stats.totalProducts}</div>
          <div class="stat-sub">publicados</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="table-container">
          <div class="table-header"><h2>Pedidos Recentes</h2></div>
          <table>
            <thead><tr><th>ID</th><th>Email</th><th>Total</th><th>Status</th><th>Data</th></tr></thead>
            <tbody>
              ${recentOrders.length ? recentOrders.map(o => `
                <tr data-id="${o.id}" onclick="navigate('order-detail',{id:'${o.id}'})">
                  <td><code style="font-size:11px;color:var(--text-3)">#${o.id.slice(-8)}</code></td>
                  <td>${o.email}</td>
                  <td>${fmt(o.total, o.currencyCode)}</td>
                  <td>${badge(ORDER_STATUS, o.status)}</td>
                  <td>${fmtDate(o.createdAt)}</td>
                </tr>`).join('') : '<tr><td colspan="5"><div class="empty-state"><p>Nenhum pedido ainda</p></div></td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="card">
          <div class="card-title">Pedidos por Status</div>
          <div class="status-bars" style="margin-top:16px">
            ${ordersByStatus.map(s => {
              const [, label] = ORDER_STATUS[s.status] || ['', s.status]
              const pct = Math.round((s.count / total) * 100)
              return `<div class="status-bar-item">
                <span class="status-bar-label">${label}</span>
                <div class="status-bar-track"><div class="status-bar-fill" style="width:${pct}%;background:${statusColors[s.status]||'#666'}"></div></div>
                <span class="status-bar-count">${s.count}</span>
              </div>`
            }).join('')}
          </div>
        </div>
      </div>
    `
  } catch (e) {
    document.getElementById('page-content').innerHTML = `<div class="error-msg">${e.message}</div>`
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────
async function renderOrders({ page = 1, q = '', status = '' } = {}) {
  const limit = 20
  const offset = (page - 1) * limit
  let url = `/orders?limit=${limit}&offset=${offset}`
  if (status) url += `&status=${status}`
  if (q) url += `&q=${encodeURIComponent(q)}`

  try {
    const data = await api(url)
    const { orders, count } = data
    const totalPages = Math.ceil(count / limit)

    const statusOptions = ['', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']
    const statusLabels = { '': 'Todos', ...Object.fromEntries(Object.entries(ORDER_STATUS).map(([k, [, v]]) => [k, v])) }

    document.getElementById('page-content').innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <h2>Pedidos <span style="color:var(--text-3);font-weight:400">(${count})</span></h2>
          <div style="display:flex;gap:8px;align-items:center">
            <select id="status-filter" style="background:var(--bg-3);border:1px solid var(--border-2);border-radius:var(--radius);padding:7px 10px;color:var(--text);font-size:13px;outline:none">
              ${statusOptions.map(s => `<option value="${s}" ${s === status ? 'selected' : ''}>${statusLabels[s]}</option>`).join('')}
            </select>
            <div class="table-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input type="text" id="order-search" placeholder="Buscar por email..." value="${q}" />
            </div>
          </div>
        </div>
        <table>
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Status</th><th>Pagamento</th><th>Data</th></tr></thead>
          <tbody>
            ${orders.length ? orders.map(o => `
              <tr onclick="navigate('order-detail',{id:'${o.id}'})">
                <td><code style="font-size:11px;color:var(--text-3)">#${o.id.slice(-8)}</code></td>
                <td>
                  <div style="font-size:13px;color:var(--text)">${o.customer ? o.customer.firstName + ' ' + o.customer.lastName : '-'}</div>
                  <div style="font-size:11px;color:var(--text-3)">${o.email}</div>
                </td>
                <td style="font-weight:500;color:var(--text)">${fmt(o.total, o.currencyCode)}</td>
                <td>${badge(ORDER_STATUS, o.status)}</td>
                <td>${badge(PAYMENT_STATUS, o.paymentStatus)}</td>
                <td style="color:var(--text-3)">${fmtDate(o.createdAt)}</td>
              </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/></svg><p>Nenhum pedido encontrado</p></div></td></tr>`}
          </tbody>
        </table>
        ${totalPages > 1 ? `
        <div class="table-footer">
          <span>Mostrando ${offset + 1}–${Math.min(offset + limit, count)} de ${count}</span>
          <div class="pagination">
            <button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="navigate('orders',{page:${page-1},q:'${q}',status:'${status}'})">‹</button>
            ${Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return `<button class="page-btn ${p === page ? 'active' : ''}" onclick="navigate('orders',{page:${p},q:'${q}',status:'${status}'})">${p}</button>`
            }).join('')}
            <button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="navigate('orders',{page:${page+1},q:'${q}',status:'${status}'})">›</button>
          </div>
        </div>` : ''}
      </div>
    `

    document.getElementById('status-filter').addEventListener('change', e => navigate('orders', { page: 1, q, status: e.target.value }))
    let searchTimer
    document.getElementById('order-search').addEventListener('input', e => {
      clearTimeout(searchTimer)
      searchTimer = setTimeout(() => navigate('orders', { page: 1, q: e.target.value, status }), 400)
    })
  } catch (e) {
    document.getElementById('page-content').innerHTML = `<div class="error-msg">${e.message}</div>`
  }
}

async function renderOrderDetail(id) {
  try {
    const { order } = await api(`/orders/${id}`)

    document.getElementById('page-title').textContent = `Pedido #${id.slice(-8)}`
    document.getElementById('topbar-actions').innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="navigate('orders')">← Voltar</button>
      ${!['CANCELLED','REFUNDED','DELIVERED'].includes(order.status) ? `<button class="btn btn-danger btn-sm" onclick="cancelOrder('${id}')">Cancelar Pedido</button>` : ''}
    `

    const shippingAddr = (() => { try { return JSON.parse(order.shippingAddressId || '{}') } catch { return {} } })()

    document.getElementById('page-content').innerHTML = `
      <div class="detail-grid">
        <div>
          <div class="card detail-section">
            <div class="detail-section-title">Itens do Pedido</div>
            ${order.items.map(item => `
              <div class="order-item">
                <div class="order-item-thumb">
                  ${item.thumbnail ? `<img src="${item.thumbnail}" alt="${item.title}" />` : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`}
                </div>
                <div class="order-item-info">
                  <div class="order-item-title">${item.title}</div>
                  <div class="order-item-variant">${item.variantTitle}</div>
                </div>
                <div style="text-align:right">
                  <div class="order-item-price">${fmt(item.total, order.currencyCode)}</div>
                  <div class="order-item-qty">x${item.quantity} · ${fmt(item.unitPrice, order.currencyCode)}</div>
                </div>
              </div>`).join('')}
          </div>

          <div class="card detail-section">
            <div class="detail-section-title">Atualizar Status</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
              ${Object.entries(ORDER_STATUS).map(([s, [cls, label]]) => `
                <button class="btn btn-sm ${order.status === s ? 'btn-primary' : 'btn-secondary'}" onclick="updateOrderStatus('${id}','${s}')">${label}</button>
              `).join('')}
            </div>
            <div style="margin-top:12px">
              <div style="font-size:12px;color:var(--text-3);margin-bottom:6px">Status de Pagamento</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${Object.entries(PAYMENT_STATUS).map(([s, [cls, label]]) => `
                  <button class="btn btn-sm ${order.paymentStatus === s ? 'btn-primary' : 'btn-secondary'}" onclick="updatePaymentStatus('${id}','${s}')">${label}</button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="card detail-section">
            <div class="detail-section-title">Resumo</div>
            <div class="detail-row"><span class="label">Subtotal</span><span class="value">${fmt(order.subtotal, order.currencyCode)}</span></div>
            <div class="detail-row"><span class="label">Frete</span><span class="value">${fmt(order.shippingTotal, order.currencyCode)}</span></div>
            <div class="detail-row"><span class="label">Impostos</span><span class="value">${fmt(order.taxTotal, order.currencyCode)}</span></div>
            ${order.discountTotal > 0 ? `<div class="detail-row"><span class="label">Desconto</span><span class="value" style="color:var(--green)">-${fmt(order.discountTotal, order.currencyCode)}</span></div>` : ''}
            <div class="detail-row" style="border-top:1px solid var(--border-2);margin-top:4px;padding-top:12px">
              <span class="label" style="font-weight:600;color:var(--text)">Total</span>
              <span class="value" style="font-size:16px">${fmt(order.total, order.currencyCode)}</span>
            </div>
          </div>

          <div class="card detail-section">
            <div class="detail-section-title">Informações</div>
            <div class="detail-row"><span class="label">ID</span><span class="value" style="font-size:11px;color:var(--text-3)">${order.id}</span></div>
            <div class="detail-row"><span class="label">Email</span><span class="value">${order.email}</span></div>
            <div class="detail-row"><span class="label">Status</span><span class="value">${badge(ORDER_STATUS, order.status)}</span></div>
            <div class="detail-row"><span class="label">Pagamento</span><span class="value">${badge(PAYMENT_STATUS, order.paymentStatus)}</span></div>
            <div class="detail-row"><span class="label">Criado em</span><span class="value">${fmtDate(order.createdAt)}</span></div>
          </div>

          ${shippingAddr.address1 ? `
          <div class="card detail-section">
            <div class="detail-section-title">Endereço de Entrega</div>
            <div style="font-size:13px;color:var(--text-2);line-height:1.8">
              ${shippingAddr.firstName} ${shippingAddr.lastName}<br/>
              ${shippingAddr.address1}${shippingAddr.address2 ? ', ' + shippingAddr.address2 : ''}<br/>
              ${shippingAddr.city}, ${shippingAddr.province} ${shippingAddr.postalCode}<br/>
              ${shippingAddr.countryCode?.toUpperCase()}
            </div>
          </div>` : ''}
        </div>
      </div>
    `
  } catch (e) {
    document.getElementById('page-content').innerHTML = `<div class="error-msg">${e.message}</div>`
  }
}

async function updateOrderStatus(id, status) {
  try {
    await api(`/orders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) })
    toast('Status atualizado')
    renderOrderDetail(id)
  } catch (e) { toast(e.message, 'error') }
}

async function updatePaymentStatus(id, paymentStatus) {
  try {
    await api(`/orders/${id}`, { method: 'PUT', body: JSON.stringify({ paymentStatus }) })
    toast('Status de pagamento atualizado')
    renderOrderDetail(id)
  } catch (e) { toast(e.message, 'error') }
}

async function cancelOrder(id) {
  if (!confirm('Cancelar este pedido?')) return
  try {
    await api(`/orders/${id}/cancel`, { method: 'POST' })
    toast('Pedido cancelado')
    renderOrderDetail(id)
  } catch (e) { toast(e.message, 'error') }
}

// ─── Products ─────────────────────────────────────────────────────────────────
async function renderProducts({ page = 1, q = '', status = '' } = {}) {
  const limit = 20
  const offset = (page - 1) * limit
  let url = `/products?limit=${limit}&offset=${offset}`
  if (status) url += `&status=${status}`
  if (q) url += `&q=${encodeURIComponent(q)}`

  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-primary btn-sm" onclick="navigate('product-form',{})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Novo Produto
    </button>
  `

  try {
    const data = await api(url)
    const { products, count } = data
    const totalPages = Math.ceil(count / limit)
    const statusOptions = ['', 'DRAFT', 'PUBLISHED', 'ARCHIVED']
    const statusLabels = { '': 'Todos', DRAFT: 'Rascunho', PUBLISHED: 'Publicado', ARCHIVED: 'Arquivado' }

    document.getElementById('page-content').innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <h2>Produtos <span style="color:var(--text-3);font-weight:400">(${count})</span></h2>
          <div style="display:flex;gap:8px;align-items:center">
            <select id="prod-status-filter" style="background:var(--bg-3);border:1px solid var(--border-2);border-radius:var(--radius);padding:7px 10px;color:var(--text);font-size:13px;outline:none">
              ${statusOptions.map(s => `<option value="${s}" ${s === status ? 'selected' : ''}>${statusLabels[s]}</option>`).join('')}
            </select>
            <div class="table-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input type="text" id="prod-search" placeholder="Buscar produto..." value="${q}" />
            </div>
          </div>
        </div>
        <table>
          <thead><tr><th>Produto</th><th>Handle</th><th>Variantes</th><th>Status</th><th>Criado</th><th></th></tr></thead>
          <tbody>
            ${products.length ? products.map(p => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:36px;height:36px;border-radius:6px;background:var(--bg-4);border:1px solid var(--border);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center">
                      ${p.thumbnail ? `<img src="${p.thumbnail}" style="width:100%;height:100%;object-fit:cover" />` : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`}
                    </div>
                    <span style="color:var(--text);font-weight:500">${p.title}</span>
                  </div>
                </td>
                <td style="color:var(--text-3);font-size:12px">${p.handle}</td>
                <td style="color:var(--text-2)">${p.variants.length} variante${p.variants.length !== 1 ? 's' : ''}</td>
                <td>${badge(PRODUCT_STATUS, p.status)}</td>
                <td style="color:var(--text-3)">${fmtDate(p.createdAt)}</td>
                <td>
                  <div style="display:flex;gap:4px" onclick="event.stopPropagation()">
                    <button class="btn btn-secondary btn-sm" onclick="navigate('product-form',{id:'${p.id}'})">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">Excluir</button>
                  </div>
                </td>
              </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg><p>Nenhum produto encontrado</p></div></td></tr>`}
          </tbody>
        </table>
        ${totalPages > 1 ? `
        <div class="table-footer">
          <span>Mostrando ${offset + 1}–${Math.min(offset + limit, count)} de ${count}</span>
          <div class="pagination">
            <button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="navigate('products',{page:${page-1},q:'${q}',status:'${status}'})">‹</button>
            ${Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return `<button class="page-btn ${p === page ? 'active' : ''}" onclick="navigate('products',{page:${p},q:'${q}',status:'${status}'})">${p}</button>`
            }).join('')}
            <button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="navigate('products',{page:${page+1},q:'${q}',status:'${status}'})">›</button>
          </div>
        </div>` : ''}
      </div>
    `

    document.getElementById('prod-status-filter').addEventListener('change', e => navigate('products', { page: 1, q, status: e.target.value }))
    let searchTimer
    document.getElementById('prod-search').addEventListener('input', e => {
      clearTimeout(searchTimer)
      searchTimer = setTimeout(() => navigate('products', { page: 1, q: e.target.value, status }), 400)
    })
  } catch (e) {
    document.getElementById('page-content').innerHTML = `<div class="error-msg">${e.message}</div>`
  }
}

async function deleteProduct(id) {
  if (!confirm('Excluir este produto? Esta ação não pode ser desfeita.')) return
  try {
    await api(`/products/${id}`, { method: 'DELETE' })
    toast('Produto excluído')
    navigate('products')
  } catch (e) { toast(e.message, 'error') }
}

async function renderProductForm(id) {
  const isEdit = !!id
  document.getElementById('page-title').textContent = isEdit ? 'Editar Produto' : 'Novo Produto'
  document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-secondary btn-sm" onclick="navigate('products')">← Voltar</button>`

  let product = { title: '', handle: '', description: '', status: 'DRAFT', thumbnail: '', tags: [], variants: [], images: [] }

  if (isEdit) {
    try {
      const data = await api(`/products/${id}`)
      product = data.product
    } catch (e) {
      document.getElementById('page-content').innerHTML = `<div class="error-msg">${e.message}</div>`
      return
    }
  }

  document.getElementById('page-content').innerHTML = `
    <form id="product-form" style="max-width:800px">
      <div style="display:grid;grid-template-columns:1fr 280px;gap:20px">
        <div>
          <div class="card" style="margin-bottom:16px">
            <div class="detail-section-title" style="margin-bottom:16px">Informações Básicas</div>
            <div class="form-group">
              <label>Título *</label>
              <input type="text" id="p-title" value="${product.title}" placeholder="Nome do produto" required />
            </div>
            <div class="form-group">
              <label>Handle *</label>
              <input type="text" id="p-handle" value="${product.handle}" placeholder="url-do-produto" required />
            </div>
            <div class="form-group">
              <label>Descrição</label>
              <textarea id="p-description" placeholder="Descrição do produto...">${product.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label>URL da Thumbnail</label>
              <input type="text" id="p-thumbnail" value="${product.thumbnail || ''}" placeholder="https://..." />
            </div>
            <div class="form-group">
              <label>Tags (separadas por vírgula)</label>
              <input type="text" id="p-tags" value="${(product.tags || []).join(', ')}" placeholder="tag1, tag2, tag3" />
            </div>
          </div>

          <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
              <div class="detail-section-title">Variantes</div>
              <button type="button" class="btn btn-secondary btn-sm" onclick="addVariantRow()">+ Adicionar</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 100px 80px 80px auto;gap:8px;margin-bottom:8px;padding:0 4px">
              <span style="font-size:11px;color:var(--text-3);text-transform:uppercase">Título</span>
              <span style="font-size:11px;color:var(--text-3);text-transform:uppercase">Preço</span>
              <span style="font-size:11px;color:var(--text-3);text-transform:uppercase">Estoque</span>
              <span style="font-size:11px;color:var(--text-3);text-transform:uppercase">SKU</span>
              <span></span>
            </div>
            <div id="variants-list" class="variants-list">
              ${(product.variants || []).map((v, i) => variantRowHTML(v, i)).join('')}
            </div>
            ${!product.variants?.length ? `<div style="text-align:center;padding:20px;color:var(--text-3);font-size:13px">Nenhuma variante. Clique em "+ Adicionar".</div>` : ''}
          </div>
        </div>

        <div>
          <div class="card" style="margin-bottom:16px">
            <div class="detail-section-title" style="margin-bottom:12px">Status</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              ${['DRAFT', 'PUBLISHED', 'ARCHIVED'].map(s => {
                const [cls, label] = PRODUCT_STATUS[s]
                return `<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px;border-radius:var(--radius);border:1px solid ${product.status === s ? 'var(--border-2)' : 'transparent'};background:${product.status === s ? 'var(--accent-dim)' : 'transparent'}">
                  <input type="radio" name="p-status" value="${s}" ${product.status === s ? 'checked' : ''} style="accent-color:white" />
                  <span class="badge ${cls}">${label}</span>
                </label>`
              }).join('')}
            </div>
          </div>

          <div class="card">
            <div class="detail-section-title" style="margin-bottom:12px">Ações</div>
            <button type="submit" class="btn btn-primary btn-full" id="save-btn">
              ${isEdit ? 'Salvar Alterações' : 'Criar Produto'}
            </button>
            ${isEdit ? `<button type="button" class="btn btn-danger btn-full" style="margin-top:8px" onclick="deleteProduct('${id}')">Excluir Produto</button>` : ''}
          </div>
        </div>
      </div>
    </form>
  `

  // Auto-generate handle from title
  document.getElementById('p-title').addEventListener('input', e => {
    if (!isEdit) {
      document.getElementById('p-handle').value = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    }
  })

  document.getElementById('product-form').addEventListener('submit', async e => {
    e.preventDefault()
    const btn = document.getElementById('save-btn')
    btn.disabled = true
    btn.textContent = 'Salvando...'

    const variants = collectVariants()
    const payload = {
      title: document.getElementById('p-title').value,
      handle: document.getElementById('p-handle').value,
      description: document.getElementById('p-description').value,
      thumbnail: document.getElementById('p-thumbnail').value,
      status: document.querySelector('input[name="p-status"]:checked')?.value || 'DRAFT',
      tags: document.getElementById('p-tags').value.split(',').map(t => t.trim()).filter(Boolean),
      variants,
    }

    try {
      if (isEdit) {
        await api(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
        toast('Produto atualizado')
      } else {
        const data = await api('/products', { method: 'POST', body: JSON.stringify(payload) })
        toast('Produto criado')
        navigate('product-form', { id: data.product.id })
        return
      }
    } catch (err) {
      toast(err.message, 'error')
    }
    btn.disabled = false
    btn.textContent = isEdit ? 'Salvar Alterações' : 'Criar Produto'
  })
}

let variantCount = 0
function variantRowHTML(v = {}, i) {
  const idx = i !== undefined ? i : variantCount++
  return `<div class="variant-row" id="vrow-${idx}">
    <input type="text" placeholder="Ex: P / Preto" value="${v.title || ''}" data-field="title" />
    <input type="number" placeholder="0.00" step="0.01" min="0" value="${v.price || ''}" data-field="price" />
    <input type="number" placeholder="0" min="0" value="${v.inventory || 0}" data-field="inventory" />
    <input type="text" placeholder="SKU" value="${v.sku || ''}" data-field="sku" />
    <button type="button" class="btn-remove-variant" onclick="document.getElementById('vrow-${idx}').remove()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>`
}

function addVariantRow() {
  const list = document.getElementById('variants-list')
  const div = document.createElement('div')
  div.innerHTML = variantRowHTML({}, variantCount++)
  list.appendChild(div.firstChild)
}

function collectVariants() {
  return Array.from(document.querySelectorAll('#variants-list .variant-row')).map(row => ({
    title: row.querySelector('[data-field="title"]').value,
    price: parseFloat(row.querySelector('[data-field="price"]').value) || 0,
    inventory: parseInt(row.querySelector('[data-field="inventory"]').value) || 0,
    sku: row.querySelector('[data-field="sku"]').value || null,
  })).filter(v => v.title)
}

// ─── Customers ────────────────────────────────────────────────────────────────
async function renderCustomers({ page = 1, q = '' } = {}) {
  const limit = 20
  const offset = (page - 1) * limit
  let url = `/customers?limit=${limit}&offset=${offset}`
  if (q) url += `&q=${encodeURIComponent(q)}`

  try {
    const data = await api(url)
    const { customers, count } = data
    const totalPages = Math.ceil(count / limit)

    document.getElementById('page-content').innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <h2>Clientes <span style="color:var(--text-3);font-weight:400">(${count})</span></h2>
          <div class="table-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" id="cust-search" placeholder="Buscar por nome ou email..." value="${q}" />
          </div>
        </div>
        <table>
          <thead><tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Pedidos</th><th>Cadastro</th></tr></thead>
          <tbody>
            ${customers.length ? customers.map(c => `
              <tr onclick="navigate('customer-detail',{id:'${c.id}'})">
                <td style="color:var(--text);font-weight:500">${c.firstName} ${c.lastName}</td>
                <td style="color:var(--text-2)">${c.email}</td>
                <td style="color:var(--text-3)">${c.phone || '-'}</td>
                <td>
                  <span class="badge badge-blue">${c._count?.orders || 0} pedido${(c._count?.orders || 0) !== 1 ? 's' : ''}</span>
                </td>
                <td style="color:var(--text-3)">${fmtDate(c.createdAt)}</td>
              </tr>`).join('') : `<tr><td colspan="5"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><p>Nenhum cliente encontrado</p></div></td></tr>`}
          </tbody>
        </table>
        ${totalPages > 1 ? `
        <div class="table-footer">
          <span>Mostrando ${offset + 1}–${Math.min(offset + limit, count)} de ${count}</span>
          <div class="pagination">
            <button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="navigate('customers',{page:${page-1},q:'${q}'})">‹</button>
            ${Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
              return `<button class="page-btn ${p === page ? 'active' : ''}" onclick="navigate('customers',{page:${p},q:'${q}'})">${p}</button>`
            }).join('')}
            <button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="navigate('customers',{page:${page+1},q:'${q}'})">›</button>
          </div>
        </div>` : ''}
      </div>
    `

    let searchTimer
    document.getElementById('cust-search').addEventListener('input', e => {
      clearTimeout(searchTimer)
      searchTimer = setTimeout(() => navigate('customers', { page: 1, q: e.target.value }), 400)
    })
  } catch (e) {
    document.getElementById('page-content').innerHTML = `<div class="error-msg">${e.message}</div>`
  }
}

async function renderCustomerDetail(id) {
  try {
    const { customer } = await api(`/customers/${id}`)
    document.getElementById('page-title').textContent = `${customer.firstName} ${customer.lastName}`
    document.getElementById('topbar-actions').innerHTML = `<button class="btn btn-secondary btn-sm" onclick="navigate('customers')">← Voltar</button>`

    document.getElementById('page-content').innerHTML = `
      <div class="detail-grid">
        <div>
          <div class="card detail-section">
            <div class="detail-section-title">Pedidos (${customer.orders.length})</div>
            ${customer.orders.length ? `
              <table style="margin-top:8px">
                <thead><tr><th>ID</th><th>Total</th><th>Status</th><th>Data</th></tr></thead>
                <tbody>
                  ${customer.orders.map(o => `
                    <tr onclick="navigate('order-detail',{id:'${o.id}'})">
                      <td><code style="font-size:11px;color:var(--text-3)">#${o.id.slice(-8)}</code></td>
                      <td style="font-weight:500;color:var(--text)">${fmt(o.total, o.currencyCode)}</td>
                      <td>${badge(ORDER_STATUS, o.status)}</td>
                      <td style="color:var(--text-3)">${fmtDate(o.createdAt)}</td>
                    </tr>`).join('')}
                </tbody>
              </table>` : `<div class="empty-state" style="padding:30px"><p>Nenhum pedido</p></div>`}
          </div>
        </div>

        <div>
          <div class="card detail-section">
            <div class="detail-section-title">Informações</div>
            <div class="detail-row"><span class="label">Nome</span><span class="value">${customer.firstName} ${customer.lastName}</span></div>
            <div class="detail-row"><span class="label">Email</span><span class="value">${customer.email}</span></div>
            <div class="detail-row"><span class="label">Telefone</span><span class="value">${customer.phone || '-'}</span></div>
            <div class="detail-row"><span class="label">CPF</span><span class="value">${customer.cpf ? customer.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '-'}</span></div>
            <div class="detail-row"><span class="label">Cadastro</span><span class="value">${fmtDate(customer.createdAt)}</span></div>
          </div>

          ${customer.addresses?.length ? `
          <div class="card detail-section">
            <div class="detail-section-title">Endereços (${customer.addresses.length})</div>
            ${customer.addresses.map(a => `
              <div style="padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;color:var(--text-2);line-height:1.8">
                ${a.firstName} ${a.lastName}<br/>
                ${a.address1}${a.address2 ? ', ' + a.address2 : ''}<br/>
                ${a.city}, ${a.province} ${a.postalCode}
                ${a.isDefault ? '<span class="badge badge-green" style="margin-left:6px">Padrão</span>' : ''}
              </div>`).join('')}
          </div>` : ''}
        </div>
      </div>
    `
  } catch (e) {
    document.getElementById('page-content').innerHTML = `<div class="error-msg">${e.message}</div>`
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Login form
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault()
    const btn = document.getElementById('login-btn')
    const errEl = document.getElementById('login-error')
    errEl.classList.add('hidden')
    btn.disabled = true
    btn.textContent = 'Entrando...'

    try {
      await login(
        document.getElementById('login-email').value,
        document.getElementById('login-password').value
      )
      showDashboard()
    } catch (err) {
      errEl.textContent = err.message || 'Email ou senha inválidos'
      errEl.classList.remove('hidden')
    }
    btn.disabled = false
    btn.textContent = 'Entrar'
  })

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    if (confirm('Sair do painel?')) logout()
  })

  // Nav links
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault()
      navigate(el.dataset.page)
    })
  })

  // Check auth and show correct screen
  const authed = await checkAuth()
  if (authed) {
    showDashboard()
  } else {
    showLogin()
  }
})
