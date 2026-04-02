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

async function fetchStats() {
  try {
    const r = await fetch(`${API}/equipment/stats`);
    const s = await r.json();
    $('statTotal').textContent = s.total;
    $('statOk').textContent = s.operativo;
    $('statMaint').textContent = s.manutenzione;
    $('statFault').textContent = s.guasto;
    $('statCrit').textContent = s.critiche;
  } catch {}
}

async function fetchDashboard() {
  fetchStats();
  try {
    const [mRes, eRes] = await Promise.all([
      fetch(`${API}/maintenance`),
      fetch(`${API}/equipment`)
    ]);
    const maintenances = await mRes.json();
    const equipments = await eRes.json();

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
  } catch {}
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
    const r = await fetch(url);
    const data = await r.json();
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
  } catch {}
}

async function fetchMaintenance() {
  const status = $('filterMaintStatus').value;
  const priority = $('filterPriority').value;
  let url = `${API}/maintenance?`;
  if (status) url += `status=${encodeURIComponent(status)}&`;
  if (priority) url += `priority=${encodeURIComponent(priority)}&`;
  try {
    const r = await fetch(url);
    const data = await r.json();
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
  } catch {}
}

async function fetchTechnicians() {
  const search = $('globalSearch').value;
  let url = `${API}/technicians?`;
  if (search) url += `search=${encodeURIComponent(search)}&`;
  try {
    const r = await fetch(url);
    const data = await r.json();
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
  } catch {}
}

function openModal(title, body) {
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = body;
  $('modal').classList.add('open');
}

function closeModal() {
  $('modal').classList.remove('open');
  editingId = null;
  editingType = null;
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
  const eRes = await fetch(`${API}/equipment`);
  const equipments = await eRes.json();
  const tRes = await fetch(`${API}/technicians`);
  const techs = await tRes.json();
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
  if (currentPage === 'equipment') { editingId = null; editingType = 'equipment'; openModal('➕ Nuova Attrezzatura', getEquipmentForm()); }
  else if (currentPage === 'technicians') { editingId = null; editingType = 'technician'; openModal('➕ Nuovo Tecnico', getTechnicianForm()); }
  else if (currentPage === 'maintenance') { editingId = null; editingType = 'maintenance'; openModal('➕ Nuovo Intervento', await getMaintenanceForm()); }
}

async function openEditEquipment(id) {
  const r = await fetch(`${API}/equipment/${id}`);
  const data = await r.json();
  editingId = id; editingType = 'equipment';
  openModal('✏️ Modifica Attrezzatura', getEquipmentForm(data));
}

async function openEditTechnician(id) {
  const r = await fetch(`${API}/technicians/${id}`);
  const data = await r.json();
  editingId = id; editingType = 'technician';
  openModal('✏️ Modifica Tecnico', getTechnicianForm(data));
}

async function openEditMaintenance(id) {
  const r = await fetch(`${API}/maintenance`);
  const all = await r.json();
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
    if (!r.ok) throw new Error();
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
    if (!r.ok) throw new Error();
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
  try {
    const url = editingId ? `${API}/maintenance/${editingId}` : `${API}/maintenance`;
    const method = editingId ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error();
    showToast(editingId ? 'Intervento aggiornato!' : 'Intervento creato!');
    closeModal(); fetchMaintenance(); fetchStats();
  } catch { showToast('Errore durante il salvataggio', 'error'); }
}

async function deleteEquipment(id) {
  if (!confirm('Eliminare questa attrezzatura?')) return;
  try {
    await fetch(`${API}/equipment/${id}`, { method: 'DELETE' });
    showToast('Attrezzatura eliminata');
    fetchEquipment(); fetchStats();
  } catch { showToast('Errore eliminazione', 'error'); }
}

async function deleteTechnician(id) {
  if (!confirm('Eliminare questo tecnico?')) return;
  try {
    await fetch(`${API}/technicians/${id}`, { method: 'DELETE' });
    showToast('Tecnico eliminato');
    fetchTechnicians();
  } catch { showToast('Errore eliminazione', 'error'); }
}

async function deleteMaintenance(id) {
  if (!confirm('Eliminare questo intervento?')) return;
  try {
    await fetch(`${API}/maintenance/${id}`, { method: 'DELETE' });
    showToast('Intervento eliminato');
    fetchMaintenance(); fetchStats();
  } catch { showToast('Errore eliminazione', 'error'); }
}

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  $(`page-${page}`).classList.add('active');
  currentPage = page;
  const titles = { dashboard: 'Dashboard', equipment: 'Attrezzature', maintenance: 'Interventi di Manutenzione', technicians: 'Gestione Tecnici' };
  const subs = { dashboard: 'Panoramica generale', equipment: 'Elenco attrezzature aziendali', maintenance: 'Pianificazione e storico interventi', technicians: 'Team di manutenzione' };
  $('pageTitle').textContent = titles[page];
  $('breadcrumb').textContent = subs[page];
  if (page === 'dashboard') fetchDashboard();
  if (page === 'equipment') fetchEquipment();
  if (page === 'maintenance') fetchMaintenance();
  if (page === 'technicians') fetchTechnicians();
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