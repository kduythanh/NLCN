const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "NLCN",
  ssl: {
    rejectUnauthorized: false, // tắt kiểm tra SSL
  },
});
module.exports = db;
