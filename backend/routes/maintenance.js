const express = require('express');
const router = express.Router();
const db = require('../database/db');

function syncNextMaintenance(equipmentId) {
  const next = db.prepare(`
    SELECT scheduled_date FROM maintenance
    WHERE equipment_id = ? AND status != 'completata' AND scheduled_date IS NOT NULL AND scheduled_date != ''
    ORDER BY scheduled_date ASC
    LIMIT 1
  `).get(equipmentId);

  db.prepare(`UPDATE equipment SET next_maintenance = ? WHERE id = ?`)
    .run(next ? next.scheduled_date : null, equipmentId);
}

router.get('/', (req, res) => {
  const { status, priority, equipment_id } = req.query;
  let query = `
    SELECT m.*, e.name as equipment_name, e.location as equipment_location,
           t.name as technician_name, t.specialization as technician_spec
    FROM maintenance m
    LEFT JOIN equipment e ON m.equipment_id = e.id
    LEFT JOIN technicians t ON m.technician_id = t.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { query += ' AND m.status = ?'; params.push(status); }
  if (priority) { query += ' AND m.priority = ?'; params.push(priority); }
  if (equipment_id) { query += ' AND m.equipment_id = ?'; params.push(equipment_id); }
  query += ' ORDER BY m.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { equipment_id, technician_id, type, description, scheduled_date, priority, status, cost } = req.body;
  if (!equipment_id || !type) return res.status(400).json({ error: 'equipment_id e tipo sono obbligatori' });
  const result = db.prepare(`
    INSERT INTO maintenance (equipment_id, technician_id, type, description, scheduled_date, priority, cost, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(equipment_id, technician_id || null, type, description, scheduled_date, priority || 'normale', cost || 0, status || 'programmata');
  syncNextMaintenance(equipment_id);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Intervento creato' });
});

router.put('/:id', (req, res) => {
  const { technician_id, type, description, scheduled_date, completed_date, status, priority, cost } = req.body;
  const existing = db.prepare('SELECT equipment_id FROM maintenance WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Non trovato' });
  const result = db.prepare(`
    UPDATE maintenance SET technician_id=?, type=?, description=?, scheduled_date=?, completed_date=?, status=?, priority=?, cost=?
    WHERE id=?
  `).run(technician_id || null, type, description, scheduled_date, completed_date || null, status, priority, cost || 0, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Non trovato' });
  syncNextMaintenance(existing.equipment_id);
  res.json({ message: 'Aggiornato' });
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT equipment_id FROM maintenance WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Non trovato' });
  db.prepare('DELETE FROM maintenance WHERE id = ?').run(req.params.id);
  syncNextMaintenance(existing.equipment_id);
  res.json({ message: 'Eliminato' });
});

module.exports = router;