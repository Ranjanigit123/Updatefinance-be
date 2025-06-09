const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  principalAmount: { type: Number, required: true, min: 0 },
  interestRate: { type: Number, required: true, min: 0, max: 100 }, // percentage
  totalAmount: { type: Number, required: true, min: 0 },
  duration: { type: Number, required: true, min: 1 }, // in months
  monthlyAmount: { type: Number, required: true, min: 0 },
  amountPaid: { type: Number, default: 0, min: 0 },
  balanceAmount: { type: Number, required: true, min: 0 },
  startDate: { type: Date, required: true },
  nextPaymentDate: { type: Date, required: true },
  lastPaymentDate: { type: Date },
  status: { type: String, enum: ['active', 'completed', 'overdue'], default: 'active' },
  paymentHistory: [{
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    method: { type: String, enum: ['online', 'cash'], default: 'online' },
    transactionId: { type: String },
    notes: { type: String }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Calculate next payment date
loanSchema.methods.calculateNextPaymentDate = function() {
  const nextDate = new Date(this.nextPaymentDate);
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate;
};

// Update balance amount
loanSchema.methods.updateBalance = function() {
  this.balanceAmount = this.totalAmount - this.amountPaid;
  if (this.balanceAmount <= 0) {
    this.status = 'completed';
    this.balanceAmount = 0;
  }
};

// Check if loan is overdue
loanSchema.methods.isOverdue = function() {
  return new Date() > this.nextPaymentDate && this.status === 'active';
};

// Update timestamp on save
loanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Loan', loanSchema);