const mongoose = require('mongoose');

const procurementSchema = new mongoose.Schema({
  produceName: {
    type: String,
    required: true,
    trim: true
  },
  produceType: {
    type: String,
    required: true,
    minlength: 2,
    match: /^[a-zA-Z\s]+$/ // Alphabets only
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  tonnage: {
    type: Number,
    required: true,
    min: 1000 // Updated to match frontend validation (min 1000 KG)
  },
  cost: {
    type: Number,
    required: true,
    min: 10000 // "not less than 5 characters" implies >= 10000
  },
  dealerName: {
    type: String,
    required: true,
    minlength: 2
  },
  branch: {
    type: String,
    required: true,
    enum: ['Maganjo', 'Matugga']
  },
  contact: {
    type: String,
    required: true,
    match: /^07\d{8}$/ // Enforce valid phone format (07XXXXXXXX)
  },
  sellingPrice: {
    type: Number,
    required: true
  },
  stock: {
    type: Number,
    default: function() { return this.tonnage; } // Automatically set stock equal to tonnage initially
  }
});

module.exports = mongoose.model('Procurement', procurementSchema);