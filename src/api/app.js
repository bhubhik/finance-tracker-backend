const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pool = require('./db');

const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(cors());

const timezoneOptions = {
  timeZone: 'Australia/Sydney',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
};

function getFirstDayOfMonth() {
  const currentDate = new Date();
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );

  return firstDayOfMonth.toLocaleDateString(undefined, timezoneOptions);
}

function getLastDayOfMonth() {
  const currentDate = new Date();
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  return lastDayOfMonth.toLocaleDateString(undefined, timezoneOptions);
}

// Insert the entry to either income or expense table
app.post('/entry', async (req, res) => {
  try {
    const { description, amount, type, entryType } = req.body;
    let tableName;
    if (entryType === 'expense') {
      tableName = 'expenses';
    } else if (entryType === 'income') {
      tableName = 'income';
    } else {
      return res.status(400).json({ error: 'Invalid entry type.' });
    }
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split('T')[0];

    const query = `INSERT INTO ${tableName} (description, type, amount, date) VALUES ($1, $2, $3, $4) RETURNING *`;
    const values = [description, type, amount, formattedDate];

    const result = await pool.query(query, values);

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

// To get the total expenses
app.get('/expense', async (req, res) => {
  try {
    const firstDayOfMonth = getFirstDayOfMonth();
    const lastDayOfMonth = getLastDayOfMonth();

    const query = `
    SELECT SUM(amount) as "totalExpense" 
    FROM expenses 
    WHERE date::DATE >= $1::DATE AND date::DATE <= $2::DATE`;

    const values = [firstDayOfMonth, lastDayOfMonth];
    const result = await pool.query(query, values);
    const totalExpense = result.rows[0].totalExpense || 0;
    res.json({ totalExpense });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
});

app.get('/entries/:tableType', async (req, res) => {
  try {
    const { tableType } = req.params;
    const firstDayOfMonth = getFirstDayOfMonth();
    const lastDayOfMonth = getLastDayOfMonth();

    let tableName;

    if (tableType === 'income') {
      tableName = 'income';
    } else if (tableType === 'expenses') {
      tableName = 'expenses';
    } else {
      res.status(400).json({ error: 'Invalid table type.' });
      return;
    }

    const query = `
    SELECT * 
    FROM ${tableName} 
    WHERE date::DATE >= $1::DATE AND date::DATE <= $2::DATE`;

    const values = [firstDayOfMonth, lastDayOfMonth];
    const result = await pool.query(query, values);
    const expenses = result.rows || [];
    res.json({ expenses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch expenses.' });
  }
});

app.listen(port, () => {
  console.log(`Server is runnin on port ${port}.`);
});
