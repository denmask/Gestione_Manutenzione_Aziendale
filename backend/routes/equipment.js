const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
  const { search, status, category } = req.query;
  let query = 'SELECT * FROM equipment WHERE 1=1';
  const params = [];
  if (search) { query += ' AND (name LIKE ? OR location LIKE ? OR serial_number LIKE ?)'; const s = `%${search}%`; params.push(s, s, s); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (category) { query += ' AND category = ?'; params.push(category); }
  query += ' ORDER BY created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM equipment').get().count;
  const operativo = db.prepare("SELECT COUNT(*) as count FROM equipment WHERE status='operativo'").get().count;
  const manutenzione = db.prepare("SELECT COUNT(*) as count FROM equipment WHERE status='manutenzione'").get().count;
  const guasto = db.prepare("SELECT COUNT(*) as count FROM equipment WHERE status='guasto'").get().count;
  const critiche = db.prepare("SELECT COUNT(*) as count FROM maintenance WHERE priority='critica' AND status != 'completata'").get().count;
  res.json({ total, operativo, manutenzione, guasto, critiche });
});

router.get('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Non trovato' });
  res.json(item);
});

router.post('/', (req, res) => {
  const { name, category, location, status, serial_number, purchase_date, last_maintenance, next_maintenance, notes } = req.body;
  if (!name || !category || !location) return res.status(400).json({ error: 'Campi obbligatori mancanti' });
  const result = db.prepare(`
    INSERT INTO equipment (name, category, location, status, serial_number, purchase_date, last_maintenance, next_maintenance, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, category, location, status || 'operativo', serial_number, purchase_date, last_maintenance, next_maintenance, notes);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Attrezzatura aggiunta' });
});

router.put('/:id', (req, res) => {
  const { name, category, location, status, serial_number, purchase_date, last_maintenance, next_maintenance, notes } = req.body;
  const result = db.prepare(`
    UPDATE equipment SET name=?, category=?, location=?, status=?, serial_number=?, purchase_date=?, last_maintenance=?, next_maintenance=?, notes=?
    WHERE id=?
  `).run(name, category, location, status, serial_number, purchase_date, last_maintenance, next_maintenance, notes, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Non trovato' });
  res.json({ message: 'Aggiornato con successo' });
});

router.delete('/:id', (req, res) => {
  // Controlla se esistono interventi di manutenzione collegati a questa attrezzatura
  const linkedMaintenance = db.prepare('SELECT COUNT(*) as count FROM maintenance WHERE equipment_id = ?').get(req.params.id);
  if (linkedMaintenance.count > 0) {
    return res.status(409).json({
      error: `Impossibile eliminare: questa attrezzatura ha ${linkedMaintenance.count} intervento/i di manutenzione collegato/i. Elimina prima gli interventi associati.`
    });
  }
  const result = db.prepare('DELETE FROM equipment WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Non trovato' });
  res.json({ message: 'Eliminato con successo' });
});

module.exports = router;