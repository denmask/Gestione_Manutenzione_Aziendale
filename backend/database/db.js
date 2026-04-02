const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'manutenzione.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL,
    status TEXT DEFAULT 'operativo',
    serial_number TEXT,
    purchase_date TEXT,
    last_maintenance TEXT,
    next_maintenance TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS technicians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    availability TEXT DEFAULT 'disponibile',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipment_id INTEGER NOT NULL,
    technician_id INTEGER,
    type TEXT NOT NULL,
    description TEXT,
    scheduled_date TEXT,
    completed_date TEXT,
    status TEXT DEFAULT 'programmata',
    priority TEXT DEFAULT 'normale',
    cost REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (equipment_id) REFERENCES equipment(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id)
  );
`);

const equipmentCount = db.prepare('SELECT COUNT(*) as count FROM equipment').get();
if (equipmentCount.count === 0) {
  const insertEquipment = db.prepare(`
    INSERT INTO equipment (name, category, location, status, serial_number, purchase_date, last_maintenance, next_maintenance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertEquipment.run('Tornio CNC X200', 'Macchinario', 'Reparto A', 'operativo', 'SN-001', '2022-03-15', '2024-10-01', '2025-04-01');
  insertEquipment.run('Compressore Aria', 'Pneumatica', 'Reparto B', 'manutenzione', 'SN-002', '2021-07-20', '2024-08-15', '2025-02-15');
  insertEquipment.run('Quadro Elettrico Principale', 'Elettrico', 'Sala Controllo', 'operativo', 'SN-003', '2020-01-10', '2024-11-20', '2025-05-20');
  insertEquipment.run('Carrello Elevatore', 'Movimentazione', 'Magazzino', 'operativo', 'SN-004', '2023-05-05', '2024-12-01', '2025-06-01');
  insertEquipment.run('Saldatrice MIG 500A', 'Saldatura', 'Reparto C', 'guasto', 'SN-005', '2019-11-30', '2024-07-10', '2025-01-10');

  const insertTech = db.prepare(`
    INSERT INTO technicians (name, specialization, phone, email, availability)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertTech.run('Marco Rossi', 'Meccanica Industriale', '333-1234567', 'marco.rossi@azienda.it', 'disponibile');
  insertTech.run('Laura Bianchi', 'Elettrotecnica', '333-2345678', 'laura.bianchi@azienda.it', 'disponibile');
  insertTech.run('Giuseppe Verdi', 'Pneumatica & Oleodinamica', '333-3456789', 'giuseppe.verdi@azienda.it', 'occupato');
  insertTech.run('Anna Ferrari', 'Informatica Industriale', '333-4567890', 'anna.ferrari@azienda.it', 'disponibile');

  const insertMaint = db.prepare(`
    INSERT INTO maintenance (equipment_id, technician_id, type, description, scheduled_date, status, priority, cost)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertMaint.run(1, 1, 'Preventiva', 'Lubrificazione e controllo assi', '2025-04-01', 'programmata', 'normale', 150);
  insertMaint.run(2, 3, 'Correttiva', 'Sostituzione valvola pressione', '2025-03-20', 'in corso', 'alta', 320);
  insertMaint.run(3, 2, 'Preventiva', 'Verifica impianto elettrico', '2025-05-20', 'programmata', 'normale', 200);
  insertMaint.run(5, 1, 'Correttiva', 'Riparazione circuito alimentazione', '2025-03-15', 'programmata', 'critica', 580);
}

module.exports = db;