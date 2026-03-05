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
    min: 0
  },
  totalAmount: {
    type: Number,
    required: false,
    min: 0
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending'
  },
  payments: [
    {
      amount: { type: Number, required: true, min: 1 },
      paidOn: { type: Date, default: Date.now },
      method: { type: String, default: 'cash' },
      note: { type: String, default: '' },
      receivedBy: { type: String, required: true }
    }
  ],
  recordedBy: {
    type: String,
    required: true,
    minlength: 2
  },
  dueDate: {
    type: Date,
    required: true
  },
  time: {
    type: String,
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

creditSaleSchema.pre('validate', function() {
  // Ensure totalAmount/amountPaid/amountDue remain coherent on every save.
  if (!this.totalAmount || this.totalAmount <= 0) {
    this.totalAmount = Number(this.amountDue || 0) + Number(this.amountPaid || 0);
  }

  const total = Number(this.totalAmount || 0);
  const paid = Number(this.amountPaid || 0);
  this.amountDue = Math.max(0, total - paid);

  if (this.amountDue <= 0) this.paymentStatus = 'paid';
  else if (paid > 0) this.paymentStatus = 'partial';
  else this.paymentStatus = 'pending';
});

module.exports = mongoose.model('CreditSale', creditSaleSchema);
