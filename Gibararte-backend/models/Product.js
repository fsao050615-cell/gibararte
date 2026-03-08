const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  emoji: { type: String, default: '🪵' },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  desc: { type: String, required: true },
  badge: { type: String, default: null },
  image: { type: String, default: null },
  stock: { type: Number, default: 1 },
  hidden: { type: Boolean, default: false },
  variants: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);