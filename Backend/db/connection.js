// db/connection.js
const knex = require('knex');
const knexConfig = require('./knexfile');
const db = knex(knexConfig);

module.exports = db;
