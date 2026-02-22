const mongoose = require('mongoose');

const creditSaleSchema = new mongoose.Schema({
  buyerName: {
    type: String,
    required: true,
    minlength: 2
  },
  nationalId: {
    type: String,
    required: true,
    // Updated to match frontend NIN regex (CM/CF followed by 12 alphanumeric)
    match: /^(CM|CF)[A-Z0-9]{12}$/ 
  },
  location: {
    type: String,
    required: true,
    minlength: 2
  },
  contact: { 
    type: String,
    required: true,
    match: /^(?:\+256|0)7\d{8}$/ // Updated to match frontend Ugandan phone regex
  },
  amountDue: {
    type: Number,
    required: true,
    min: 10000 // "not less than 5 characters"
  },
  recordedBy: {
    type: String,
    required: true,
    minlength: 2
  },
  dueDate: {
    type: Date,
    required: true
  },
  produceName: {
    type: String,
    required: true,
    minlength: 2
  },
  produceType: {
    type: String,
    required: true
  },
  tonnage: {
    type: Number,
    required: true
  },
  dispatchDate: {
    type: Date,
    required: true
  },
  branch: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('CreditSale', creditSaleSchema);