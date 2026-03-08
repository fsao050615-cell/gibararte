require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const products = [
  {
    id: 1, emoji: '💃', name: 'La Bailadora', category: 'folklore', price: 45,
    desc: 'Figura de mujer bailando salsa, tallada en caoba con vestido pintado a mano.',
    badge: 'hot',
    variants: [
      { name: 'La Bailadora (Pequeña)', price: 35, emoji: '💃', desc: 'Versión de 15 cm' },
      { name: 'La Bailadora (Mediana)', price: 45, emoji: '💃', desc: 'Versión de 25 cm' },
      { name: 'La Bailadora (Grande)', price: 65, emoji: '💃', desc: 'Versión de 35 cm' }
    ]
  },
  {
    id: 2, emoji: '🎺', name: 'El Trompetista', category: 'musica', price: 55,
    desc: 'Músico de son cubano con trompeta, madera de cedro, acabado en óleo.',
    badge: 'new',
    variants: [
      { name: 'El Trompetista (Dorado)', price: 55, emoji: '🎺', desc: 'Acabado en pintura dorada' },
      { name: 'El Trompetista (Natural)', price: 50, emoji: '🎺', desc: 'Madera natural' }
    ]
  },
  // ... resto de productos (del array original)
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log('Base de datos poblada');
  mongoose.disconnect();
}

seed().catch(err => console.error(err));