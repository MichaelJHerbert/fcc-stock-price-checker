const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const stockSchema = new Schema({
  stock_ticker: String,
  stock_name: String,
  price: String,
  ip_likes: { type: [String], default: []}
});

const Stock = mongoose.model('Stock', stockSchema);

module.exports = Stock;