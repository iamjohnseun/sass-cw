const sql = require('mssql');

const config = {
  server: process.env.AZURE_SQL_SERVER,
  database: process.env.AZURE_SQL_DATABASE,
  user: process.env.AZURE_SQL_USER,
  password: process.env.AZURE_SQL_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    connectionTimeout: 30000,
    requestTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool = null;

async function getConnection() {
  try {
    if (!pool) {
      pool = await sql.connect(config);
    }
    return pool;
  } catch (err) {
    console.error('Database connection error:', err);
    throw err;
  }
}

async function query(queryText, params = {}) {
  try {
    const connection = await getConnection();
    const request = connection.request();

    // Add parameters to the request
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });

    const result = await request.query(queryText);
    return result.recordset;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}

async function execute(queryText, params = {}) {
  try {
    const connection = await getConnection();
    const request = connection.request();

    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });

    const result = await request.query(queryText);
    return result;
  } catch (err) {
    console.error('Execute error:', err);
    throw err;
  }
}

async function closeConnection() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

module.exports = {
  getConnection,
  query,
  execute,
  closeConnection
};
