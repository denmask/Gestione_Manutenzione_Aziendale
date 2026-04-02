const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/technicians', require('./routes/technicians'));
app.use('/api/maintenance', require('./routes/maintenance'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});