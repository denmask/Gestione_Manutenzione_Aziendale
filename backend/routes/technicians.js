const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
  const { search, availability } = req.query;
  let query = 'SELECT * FROM technicians WHERE 1=1';
  const params = [];
  if (search) { query += ' AND (name LIKE ? OR specialization LIKE ?)'; const s = `%${search}%`; params.push(s, s); }
  if (availability) { query += ' AND availability = ?'; params.push(availability); }
  query += ' ORDER BY name ASC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM technicians WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Non trovato' });
  res.json(item);
});

router.post('/', (req, res) => {
  const { name, specialization, phone, email, availability } = req.body;
  if (!name || !specialization) return res.status(400).json({ error: 'Nome e specializzazione obbligatori' });
  const result = db.prepare(`
    INSERT INTO technicians (name, specialization, phone, email, availability)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, specialization, phone, email, availability || 'disponibile');
  res.status(201).json({ id: result.lastInsertRowid, message: 'Tecnico aggiunto' });
});

router.put('/:id', (req, res) => {
  const { name, specialization, phone, email, availability } = req.body;
  const result = db.prepare(`
    UPDATE technicians SET name=?, specialization=?, phone=?, email=?, availability=? WHERE id=?
  `).run(name, specialization, phone, email, availability, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Non trovato' });
  res.json({ message: 'Aggiornato' });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM technicians WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Non trovato' });
  res.json({ message: 'Eliminato' });
});

module.exports = router;