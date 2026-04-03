const API = 'http://localhost:3000/api';
let currentPage = 'dashboard';
let editingId = null;
let editingType = null;

const $ = id => document.getElementById(id);

function showToast(msg, type = 'success') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

function getBadgeClass(value, type) {
  if (type === 'status') {
    if (value === 'operativo') return 'badge-green';
    if (value === 'manutenzione') return 'badge-yellow';
    if (value === 'guasto') return 'badge-red';
    return 'badge-gray';
  }
  if (type === 'priority') {
    if (value === 'critica') return 'badge-red';
    if (value === 'alta') return 'badge-orange';
    if (value === 'normale') return 'badge-blue';
    return 'badge-gray';
  }
  if (type === 'mstatus') {
    if (value === 'completata') return 'badge-green';
    if (value === 'in corso') return 'badge-yellow';
    if (value === 'programmata') return 'badge-blue';
    return 'badge-gray';
  }
  if (type === 'avail') {
    if (value === 'disponibile') return 'badge-green';
    if (value === 'occupato') return 'badge-yellow';
    return 'badge-gray';
  }
  return 'badge-gray';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('it-IT');
}

function setLoadingError(id, msg) {
  const el = $(id);
  if (el) el.innerHTML = `<p class="alert-empty" style="color:var(--red)">${msg}</p>`;
}

async function safeFetch(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function fetchStats() {
  try {
    const s = await safeFetch(`${API}/equipment/stats`);
    $('statTotal').textContent = s.total;
    $('statOk').textContent = s.operativo;
    $('statMaint').textContent = s.manutenzione;
    $('statFault').textContent = s.guasto;
    $('statCrit').textContent = s.critiche;
  } catch {
    ['statTotal','statOk','statMaint','statFault','statCrit'].forEach(id => $(id).textContent = '—');
  }
}

async function fetchDashboard() {
  fetchStats();
  try {
    const [maintenances, equipments] = await Promise.all([
      safeFetch(`${API}/maintenance`),
      safeFetch(`${API}/equipment`)
    ]);
    const mEl = $('recentMaintenance');
    const recent = maintenances.slice(0, 6);
    mEl.innerHTML = recent.length ? recent.map(m => {
      const dotClass = m.priority === 'critica' ? 'maint-dot-crit' : m.priority === 'alta' ? 'maint-dot-high' : 'maint-dot-norm';
      return `<div class="maintenance-item"><div class="maint-dot ${dotClass}"></div><div class="maint-info"><div class="maint-name">${m.equipment_name || '—'}</div><div class="maint-sub">${m.type} · ${m.technician_name || 'Non assegnato'}</div></div><span class="badge ${getBadgeClass(m.status, 'mstatus')}">${m.status}</span></div>`;
    }).join('') : '<p style="color:var(--text-muted);text-align:center;padding:20px">Nessun intervento</p>';
    const eEl = $('equipmentStatusList');
    eEl.innerHTML = equipments.slice(0, 6).map(e => `
      <div class="equip-status-item">
        <div><div class="equip-status-name">${e.name}</div><div class="equip-status-loc">📍 ${e.location}</div></div>
        <span class="badge ${getBadgeClass(e.status, 'status')}">${e.status}</span>
      </div>`).join('');
  } catch {
    $('recentMaintenance').innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">Errore caricamento dati</p>';
    $('equipmentStatusList').innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px">Errore caricamento dati</p>';
  }
}

async function fetchEquipment() {
  const search = $('globalSearch').value;
  const status = $('filterStatus').value;
  const category = $('filterCategory').value;
  let url = `${API}/equipment?`;
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (status) url += `status=${encodeURIComponent(status)}&`;
  if (category) url += `category=${encodeURIComponent(category)}&`;
  try {
    const data = await safeFetch(url);
    const tbody = $('equipmentBody');
    tbody.innerHTML = data.length ? data.map((e, i) => `
      <tr style="animation-delay:${i * 0.04}s">
        <td><div class="name-cell">${e.name}<div class="sub">${e.serial_number || ''}</div></div></td>
        <td>${e.category}</td>
        <td>📍 ${e.location}</td>
        <td><span class="badge ${getBadgeClass(e.status, 'status')}">${e.status}</span></td>
        <td>${formatDate(e.next_maintenance)}</td>
        <td><div class="actions-cell">
          <button class="btn-icon" onclick="openEditEquipment(${e.id})" title="Modifica">✏️</button>
          <button class="btn-icon btn-del" onclick="deleteEquipment(${e.id})" title="Elimina">🗑</button>
        </div></td>
      </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">Nessuna attrezzatura trovata</td></tr>`;
  } catch {
    $('equipmentBody').innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--red)">Errore caricamento attrezzature</td></tr>`;
  }
}

async function fetchMaintenance() {
  const status = $('filterMaintStatus').value;
  const priority = $('filterPriority').value;
  let url = `${API}/maintenance?`;
  if (status) url += `status=${encodeURIComponent(status)}&`;
  if (priority) url += `priority=${encodeURIComponent(priority)}&`;
  try {
    const data = await safeFetch(url);
    const tbody = $('maintenanceBody');
    tbody.innerHTML = data.length ? data.map((m, i) => `
      <tr style="animation-delay:${i * 0.04}s">
        <td><div class="name-cell">${m.equipment_name || '—'}<div class="sub">${m.equipment_location || ''}</div></div></td>
        <td>${m.type}</td>
        <td>${m.technician_name || '<span style="color:var(--text-muted)">Non assegnato</span>'}</td>
        <td><span class="badge ${getBadgeClass(m.priority, 'priority')}">${m.priority}</span></td>
        <td><span class="badge ${getBadgeClass(m.status, 'mstatus')}">${m.status}</span></td>
        <td>${formatDate(m.scheduled_date)}</td>
        <td>${m.cost ? '€ ' + Number(m.cost).toFixed(2) : '—'}</td>
        <td><div class="actions-cell">
          <button class="btn-icon" onclick="openEditMaintenance(${m.id})" title="Modifica">✏️</button>
          <button class="btn-icon btn-del" onclick="deleteMaintenance(${m.id})" title="Elimina">🗑</button>
        </div></td>
      </tr>`).join('') : `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)">Nessun intervento trovato</td></tr>`;
  } catch {
    $('maintenanceBody').innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--red)">Errore caricamento interventi</td></tr>`;
  }
}

async function fetchTechnicians() {
  const search = $('globalSearch').value;
  let url = `${API}/technicians?`;
  if (search) url += `search=${encodeURIComponent(search)}&`;
  try {
    const data = await safeFetch(url);
    const grid = $('techniciansGrid');
    grid.innerHTML = data.length ? data.map((t, i) => `
      <div class="tech-card" style="animation-delay:${i * 0.07}s">
        <div class="tech-avatar">${t.name.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
        <div class="tech-name">${t.name}</div>
        <div class="tech-spec">🔧 ${t.specialization}</div>
        <div class="tech-info">
          ${t.phone ? `<div class="tech-info-row">📞 ${t.phone}</div>` : ''}
          ${t.email ? `<div class="tech-info-row">✉️ ${t.email}</div>` : ''}
        </div>
        <div class="tech-footer">
          <span class="badge ${getBadgeClass(t.availability, 'avail')}">${t.availability}</span>
          <div class="tech-actions">
            <button class="btn-icon" onclick="openEditTechnician(${t.id})" title="Modifica">✏️</button>
            <button class="btn-icon btn-del" onclick="deleteTechnician(${t.id})" title="Elimina">🗑</button>
          </div>
        </div>
      </div>`).join('') : '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:40px">Nessun tecnico trovato</p>';
  } catch {
    $('techniciansGrid').innerHTML = '<p style="color:var(--red);grid-column:1/-1;text-align:center;padding:40px">Errore caricamento tecnici</p>';
  }
}

async function fetchAlerts() {
  const alertIds = ['alertsOverdue','alertsSoon','alertsCritical','alertsFermo'];
  alertIds.forEach(id => {
    $(id).innerHTML = '<div class="loading-spinner" style="margin:20px auto"></div>';
  });
  ['pillOverdue','pillSoon','pillCritical','pillFermo'].forEach(id => $(id).textContent = '—');

  try {
    const [equipments, maintenances] = await Promise.all([
      safeFetch(`${API}/equipment`),
      safeFetch(`${API}/maintenance`)
    ]);

    const today = new Date(); today.setHours(0,0,0,0);
    const in30 = new Date(today); in30.setDate(in30.getDate() + 30);

    const overdue = equipments.filter(e => e.next_maintenance && new Date(e.next_maintenance) < today);
    const soon = equipments.filter(e => {
      if (!e.next_maintenance) return false;
      const d = new Date(e.next_maintenance);
      return d >= today && d <= in30;
    });
    const criticalOpen = maintenances.filter(m => m.priority === 'critica' && m.status !== 'completata');
    const fermo = equipments.filter(e => e.status === 'guasto' || e.status === 'manutenzione');

    const totalAlert = overdue.length + criticalOpen.length;
    const badge = $('alertBadge');
    if (totalAlert > 0) { badge.textContent = totalAlert; badge.style.display = 'inline-flex'; }
    else { badge.style.display = 'none'; }

    const emptyMsg = txt => `<p class="alert-empty">${txt}</p>`;
    const alertRow = (icon, title, sub, badgeClass, badgeText) => `
      <div class="alert-row">
        <div class="alert-icon">${icon}</div>
        <div class="alert-info"><div class="alert-name">${title}</div><div class="alert-sub">${sub}</div></div>
        <span class="badge ${badgeClass}">${badgeText}</span>
      </div>`;

    $('pillOverdue').textContent = overdue.length;
    $('alertsOverdue').innerHTML = overdue.length
      ? overdue.map(e => alertRow('📅', e.name, `📍 ${e.location} · scaduta il ${formatDate(e.next_maintenance)}`, 'badge-red', e.status)).join('')
      : emptyMsg('Nessuna manutenzione scaduta ✅');

    $('pillSoon').textContent = soon.length;
    $('alertsSoon').innerHTML = soon.length
      ? soon.map(e => {
          const days = Math.ceil((new Date(e.next_maintenance) - today) / 86400000);
          return alertRow('⏰', e.name, `📍 ${e.location} · tra ${days} giorno/i`, 'badge-yellow', formatDate(e.next_maintenance));
        }).join('')
      : emptyMsg('Nessuna scadenza nei prossimi 30 giorni ✅');

    $('pillCritical').textContent = criticalOpen.length;
    $('alertsCritical').innerHTML = criticalOpen.length
      ? criticalOpen.map(m => alertRow('🔴', m.equipment_name || '—', `${m.type} · ${m.technician_name || 'Non assegnato'}`, 'badge-red', m.status)).join('')
      : emptyMsg('Nessun intervento critico aperto ✅');

    $('pillFermo').textContent = fermo.length;
    $('alertsFermo').innerHTML = fermo.length
      ? fermo.map(e => alertRow('🛑', e.name, `📍 ${e.location}`, getBadgeClass(e.status, 'status'), e.status)).join('')
      : emptyMsg('Tutte le attrezzature sono operative ✅');

  } catch(err) {
    console.error('fetchAlerts error:', err);
    alertIds.forEach(id => setLoadingError(id, 'Errore caricamento — verifica che il server sia attivo'));
    ['pillOverdue','pillSoon','pillCritical','pillFermo'].forEach(id => $(id).textContent = '!');
  }
}

function renderBarChart(containerId, items, colorFn) {
  if (!items.length) { $(containerId).innerHTML = '<p class="alert-empty">Nessun dato disponibile</p>'; return; }
  const max = Math.max(...items.map(i => i.value));
  $(containerId).innerHTML = items.map(item => `
    <div class="report-bar-row">
      <div class="report-bar-label">${item.label}</div>
      <div class="report-bar-track">
        <div class="report-bar-fill" style="width:${max > 0 ? (item.value / max * 100) : 0}%;background:${colorFn(item.label)}"></div>
      </div>
      <div class="report-bar-value">${item.display || item.value}</div>
    </div>`).join('');
}

async function fetchReport() {
  ['reportByStatus','reportByPriority','reportByCost','reportByTech'].forEach(id => {
    $(id).innerHTML = '<div class="loading-spinner" style="margin:20px auto"></div>';
  });
  try {
    const maintenances = await safeFetch(`${API}/maintenance`);

    const byStatus = ['programmata','in corso','completata'].map(s => ({
      label: s, value: maintenances.filter(m => m.status === s).length
    }));
    renderBarChart('reportByStatus', byStatus, l => {
      if (l === 'completata') return 'var(--green)';
      if (l === 'in corso') return 'var(--yellow)';
      return 'var(--accent)';
    });

    const byPriority = ['critica','alta','normale','bassa']
      .map(p => ({ label: p, value: maintenances.filter(m => m.priority === p).length }))
      .filter(x => x.value > 0);
    renderBarChart('reportByPriority', byPriority, l => {
      if (l === 'critica') return 'var(--red)';
      if (l === 'alta') return 'var(--orange)';
      if (l === 'normale') return 'var(--accent)';
      return 'var(--text-muted)';
    });

    const costMap = {};
    maintenances.forEach(m => {
      if (!m.equipment_name) return;
      costMap[m.equipment_name] = (costMap[m.equipment_name] || 0) + (Number(m.cost) || 0);
    });
    const byCost = Object.entries(costMap)
      .map(([label, value]) => ({ label, value, display: '€ ' + value.toFixed(0) }))
      .sort((a, b) => b.value - a.value).slice(0, 5);
    renderBarChart('reportByCost', byCost, () => 'var(--accent)');

    const techMap = {};
    maintenances.forEach(m => {
      const name = m.technician_name || 'Non assegnato';
      techMap[name] = (techMap[name] || 0) + 1;
    });
    const byTech = Object.entries(techMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    renderBarChart('reportByTech', byTech, () => 'var(--green)');

  } catch(err) {
    console.error('fetchReport error:', err);
    ['reportByStatus','reportByPriority','reportByCost','reportByTech'].forEach(id =>
      setLoadingError(id, 'Errore caricamento — verifica che il server sia attivo')
    );
  }
}

function openModal(title, body) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = body;
  $('modal').classList.add('open');
}

function closeModal() {
  $('modal').classList.remove('open');
  editingId = null; editingType = null;
}

function getEquipmentForm(data = {}) {
  return `<div class="form-grid">
    <div class="form-group"><label>Nome *</label><input class="form-input" id="f_name" value="${data.name||''}" placeholder="es. Tornio CNC X200" /></div>
    <div class="form-group"><label>Categoria *</label><select class="form-input" id="f_category">
      ${['Macchinario','Elettrico','Pneumatica','Saldatura','Movimentazione','Informatica','Altro'].map(c => `<option ${data.category===c?'selected':''}>${c}</option>`).join('')}
    </select></div>
    <div class="form-group"><label>Ubicazione *</label><input class="form-input" id="f_location" value="${data.location||''}" placeholder="es. Reparto A" /></div>
    <div class="form-group"><label>Stato</label><select class="form-input" id="f_status">
      ${['operativo','manutenzione','guasto'].map(s => `<option ${data.status===s?'selected':''}>${s}</option>`).join('')}
    </select></div>
    <div class="form-group"><label>Matricola</label><input class="form-input" id="f_serial" value="${data.serial_number||''}" /></div>
    <div class="form-group"><label>Data Acquisto</label><input type="date" class="form-input" id="f_purchase" value="${data.purchase_date||''}" /></div>
    <div class="form-group"><label>Ultima Manutenzione</label><input type="date" class="form-input" id="f_last" value="${data.last_maintenance||''}" /></div>
    <div class="form-group"><label>Prossima Manutenzione</label><input type="date" class="form-input" id="f_next" value="${data.next_maintenance||''}" /></div>
    <div class="form-group full"><label>Note</label><textarea class="form-input" id="f_notes" rows="3" placeholder="Note aggiuntive...">${data.notes||''}</textarea></div>
  </div>
  <div class="modal-footer">
    <button class="btn-secondary" onclick="closeModal()">Annulla</button>
    <button class="btn-primary" onclick="saveEquipment()">💾 Salva</button>
  </div>`;
}

function getTechnicianForm(data = {}) {
  return `<div class="form-grid">
    <div class="form-group"><label>Nome *</label><input class="form-input" id="f_name" value="${data.name||''}" /></div>
    <div class="form-group"><label>Specializzazione *</label><input class="form-input" id="f_spec" value="${data.specialization||''}" placeholder="es. Meccanica Industriale" /></div>
    <div class="form-group"><label>Telefono</label><input class="form-input" id="f_phone" value="${data.phone||''}" /></div>
    <div class="form-group"><label>Email</label><input class="form-input" id="f_email" value="${data.email||''}" /></div>
    <div class="form-group full"><label>Disponibilità</label><select class="form-input" id="f_avail">
      ${['disponibile','occupato','ferie'].map(a => `<option ${data.availability===a?'selected':''}>${a}</option>`).join('')}
    </select></div>
  </div>
  <div class="modal-footer">
    <button class="btn-secondary" onclick="closeModal()">Annulla</button>
    <button class="btn-primary" onclick="saveTechnician()">💾 Salva</button>
  </div>`;
}

async function getMaintenanceForm(data = {}) {
  const [equipments, techs] = await Promise.all([
    safeFetch(`${API}/equipment`),
    safeFetch(`${API}/technicians`)
  ]);
  return `<div class="form-grid">
    <div class="form-group full"><label>Attrezzatura *</label><select class="form-input" id="f_equip">
      ${equipments.map(e => `<option value="${e.id}" ${data.equipment_id==e.id?'selected':''}>${e.name}</option>`).join('')}
    </select></div>
    <div class="form-group full"><label>Tecnico</label><select class="form-input" id="f_tech">
      <option value="">— Non assegnato —</option>
      ${techs.map(t => `<option value="${t.id}" ${data.technician_id==t.id?'selected':''}>${t.name}</option>`).join('')}
    </select></div>
    <div class="form-group"><label>Tipo *</label><select class="form-input" id="f_type">
      ${['Preventiva','Correttiva','Straordinaria','Ispezione'].map(tp => `<option ${data.type===tp?'selected':''}>${tp}</option>`).join('')}
    </select></div>
    <div class="form-group"><label>Priorità</label><select class="form-input" id="f_priority">
      ${['normale','bassa','alta','critica'].map(p => `<option ${data.priority===p?'selected':''}>${p}</option>`).join('')}
    </select></div>
    <div class="form-group"><label>Stato</label><select class="form-input" id="f_mstatus">
      ${['programmata','in corso','completata'].map(s => `<option ${data.status===s?'selected':''}>${s}</option>`).join('')}
    </select></div>
    <div class="form-group"><label>Costo (€)</label><input type="number" class="form-input" id="f_cost" value="${data.cost||0}" min="0" step="0.01" /></div>
    <div class="form-group"><label>Data Programmata</label><input type="date" class="form-input" id="f_sched" value="${data.scheduled_date||''}" /></div>
    <div class="form-group"><label>Data Completamento</label><input type="date" class="form-input" id="f_completed" value="${data.completed_date||''}" /></div>
    <div class="form-group full"><label>Descrizione</label><textarea class="form-input" id="f_desc" rows="3">${data.description||''}</textarea></div>
  </div>
  <div class="modal-footer">
    <button class="btn-secondary" onclick="closeModal()">Annulla</button>
    <button class="btn-primary" onclick="saveMaintenance()">💾 Salva</button>
  </div>`;
}

async function openAddModal() {
  if (currentPage === 'equipment') {
    editingId = null; editingType = 'equipment';
    openModal('➕ Nuova Attrezzatura', getEquipmentForm());
  } else if (currentPage === 'technicians') {
    editingId = null; editingType = 'technician';
    openModal('➕ Nuovo Tecnico', getTechnicianForm());
  } else if (['maintenance','dashboard','alerts'].includes(currentPage)) {
    editingId = null; editingType = 'maintenance';
    openModal('➕ Nuovo Intervento', await getMaintenanceForm());
  }
}

async function openEditEquipment(id) {
  const data = await safeFetch(`${API}/equipment/${id}`);
  editingId = id; editingType = 'equipment';
  openModal('✏️ Modifica Attrezzatura', getEquipmentForm(data));
}

async function openEditTechnician(id) {
  const data = await safeFetch(`${API}/technicians/${id}`);
  editingId = id; editingType = 'technician';
  openModal('✏️ Modifica Tecnico', getTechnicianForm(data));
}

async function openEditMaintenance(id) {
  const all = await safeFetch(`${API}/maintenance`);
  const data = all.find(m => m.id == id);
  editingId = id; editingType = 'maintenance';
  openModal('✏️ Modifica Intervento', await getMaintenanceForm(data));
}

async function saveEquipment() {
  const body = {
    name: $('f_name').value, category: $('f_category').value, location: $('f_location').value,
    status: $('f_status').value, serial_number: $('f_serial').value, purchase_date: $('f_purchase').value,
    last_maintenance: $('f_last').value, next_maintenance: $('f_next').value, notes: $('f_notes').value
  };
  if (!body.name || !body.category || !body.location) { showToast('Compila tutti i campi obbligatori', 'error'); return; }
  try {
    const url = editingId ? `${API}/equipment/${editingId}` : `${API}/equipment`;
    const method = editingId ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const err = await r.json(); showToast(err.error || 'Errore salvataggio', 'error'); return; }
    showToast(editingId ? 'Attrezzatura aggiornata!' : 'Attrezzatura aggiunta!');
    closeModal(); fetchEquipment(); fetchStats();
  } catch { showToast('Errore durante il salvataggio', 'error'); }
}

async function saveTechnician() {
  const body = { name: $('f_name').value, specialization: $('f_spec').value, phone: $('f_phone').value, email: $('f_email').value, availability: $('f_avail').value };
  if (!body.name || !body.specialization) { showToast('Nome e specializzazione obbligatori', 'error'); return; }
  try {
    const url = editingId ? `${API}/technicians/${editingId}` : `${API}/technicians`;
    const method = editingId ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const err = await r.json(); showToast(err.error || 'Errore salvataggio', 'error'); return; }
    showToast(editingId ? 'Tecnico aggiornato!' : 'Tecnico aggiunto!');
    closeModal(); fetchTechnicians();
  } catch { showToast('Errore durante il salvataggio', 'error'); }
}

async function saveMaintenance() {
  const body = {
    equipment_id: $('f_equip').value, technician_id: $('f_tech').value || null,
    type: $('f_type').value, priority: $('f_priority').value, status: $('f_mstatus').value,
    cost: $('f_cost').value, scheduled_date: $('f_sched').value, completed_date: $('f_completed').value,
    description: $('f_desc').value
  };
  if (!body.equipment_id) { showToast("Seleziona un'attrezzatura", 'error'); return; }
  try {
    const url = editingId ? `${API}/maintenance/${editingId}` : `${API}/maintenance`;
    const method = editingId ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { const err = await r.json(); showToast(err.error || 'Errore salvataggio', 'error'); return; }
    showToast(editingId ? 'Intervento aggiornato!' : 'Intervento creato!');
    closeModal();
    fetchMaintenance(); fetchStats();
    if (currentPage === 'dashboard') fetchDashboard();
    if (currentPage === 'alerts') fetchAlerts();
    if (currentPage === 'report') fetchReport();
  } catch { showToast('Errore durante il salvataggio', 'error'); }
}

async function deleteEquipment(id) {
  if (!confirm('Eliminare questa attrezzatura?')) return;
  try {
    const r = await fetch(`${API}/equipment/${id}`, { method: 'DELETE' });
    if (!r.ok) { const err = await r.json(); showToast(err.error || 'Errore eliminazione', 'error'); return; }
    showToast('Attrezzatura eliminata');
    fetchEquipment(); fetchStats();
  } catch { showToast('Errore eliminazione', 'error'); }
}

async function deleteTechnician(id) {
  if (!confirm('Eliminare questo tecnico?')) return;
  try {
    const r = await fetch(`${API}/technicians/${id}`, { method: 'DELETE' });
    if (!r.ok) { const err = await r.json(); showToast(err.error || 'Errore eliminazione', 'error'); return; }
    showToast('Tecnico eliminato');
    fetchTechnicians();
  } catch { showToast('Errore eliminazione', 'error'); }
}

async function deleteMaintenance(id) {
  if (!confirm('Eliminare questo intervento?')) return;
  try {
    const r = await fetch(`${API}/maintenance/${id}`, { method: 'DELETE' });
    if (!r.ok) { const err = await r.json(); showToast(err.error || 'Errore eliminazione', 'error'); return; }
    showToast('Intervento eliminato');
    fetchMaintenance(); fetchStats();
    if (currentPage === 'dashboard') fetchDashboard();
    if (currentPage === 'alerts') fetchAlerts();
    if (currentPage === 'report') fetchReport();
  } catch { showToast('Errore eliminazione', 'error'); }
}

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  $(`page-${page}`).classList.add('active');
  currentPage = page;
  const titles = {
    dashboard: 'Dashboard', equipment: 'Attrezzature',
    maintenance: 'Interventi di Manutenzione', technicians: 'Gestione Tecnici',
    alerts: 'Scadenze & Alert', report: 'Report'
  };
  const subs = {
    dashboard: 'Panoramica generale', equipment: 'Elenco attrezzature aziendali',
    maintenance: 'Pianificazione e storico interventi', technicians: 'Team di manutenzione',
    alerts: 'Controllo scadenze e situazioni critiche', report: 'Analisi e statistiche'
  };
  $('pageTitle').textContent = titles[page];
  $('breadcrumb').textContent = subs[page];
  if (page === 'dashboard')   fetchDashboard();
  if (page === 'equipment')   fetchEquipment();
  if (page === 'maintenance') fetchMaintenance();
  if (page === 'technicians') fetchTechnicians();
  if (page === 'alerts')      fetchAlerts();
  if (page === 'report')      fetchReport();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.page); });
});

$('addBtn').addEventListener('click', openAddModal);
$('modalClose').addEventListener('click', closeModal);
$('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });

$('globalSearch').addEventListener('input', () => {
  if (currentPage === 'equipment') fetchEquipment();
  if (currentPage === 'technicians') fetchTechnicians();
});

$('filterStatus').addEventListener('change', fetchEquipment);
$('filterCategory').addEventListener('change', fetchEquipment);
$('filterMaintStatus').addEventListener('change', fetchMaintenance);
$('filterPriority').addEventListener('change', fetchMaintenance);

fetchDashboard();
fetchAlerts();