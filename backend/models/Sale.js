const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  produceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procurement',
    required: false // Changed to false as form only provides produceName
  },
  produceName: {
    type: String,
    required: true
  },
  tonnage: {
    type: Number,
    required: true
  },
  amountPaid: {
    type: Number,
    required: true,
    min: 10000 // "not less than 5 characters"
  },
  buyerName: {
    type: String,
    required: true,
    minlength: 2
  },
  recordedBy: {
    type: String,
    required: true,
    minlength: 2
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Sale', saleSchema);