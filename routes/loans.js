const express = require('express');
const Loan = require('../models/Loan');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Create new loan (owner only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Only owners can create loans' });
    }
    
    const { borrowerId, principalAmount, interestRate, duration } = req.body;
    
    // Verify borrower exists
    const borrower = await User.findById(borrowerId);
    if (!borrower || borrower.role !== 'borrower') {
      return res.status(400).json({ message: 'Invalid borrower' });
    }
    
    // Calculate loan details
    const totalAmount = principalAmount + (principalAmount * interestRate / 100);
    const monthlyAmount = totalAmount / duration;
    const startDate = new Date();
    const nextPaymentDate = new Date(startDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    
    const loan = new Loan({
      owner: req.user.userId,
      borrower: borrowerId,
      principalAmount,
      interestRate,
      totalAmount,
      duration,
      monthlyAmount,
      balanceAmount: totalAmount,
      startDate,
      nextPaymentDate
    });
    
    await loan.save();
    await loan.populate(['owner', 'borrower']);
    
    res.status(201).json({ message: 'Loan created successfully', loan });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create loan', error: error.message });
  }
});

// Get loans for current user
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'owner') {
      query.owner = req.user.userId;
    } else {
      query.borrower = req.user.userId;
    }
    
    const loans = await Loan.find(query)
      .populate('owner', '-password')
      .populate('borrower', '-password')
      .sort({ createdAt: -1 });
    
    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch loans', error: error.message });
  }
});

// Get specific loan
router.get('/:id', auth, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate('owner', '-password')
      .populate('borrower', '-password');
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    
    // Check if user has access to this loan
    if (loan.owner._id.toString() !== req.user.userId && 
        loan.borrower._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json(loan);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch loan', error: error.message });
  }
});

// Make payment (borrower or owner can update)
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const { amount, method = 'online', transactionId, notes } = req.body;
    
    const loan = await Loan.findById(req.params.id)
      .populate('owner', '-password')
      .populate('borrower', '-password');
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    
    // Check access
    if (loan.owner._id.toString() !== req.user.userId && 
        loan.borrower._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Add payment to history
    loan.paymentHistory.push({
      amount: parseFloat(amount),
      date: new Date(),
      method,
      transactionId,
      notes
    });
    
    // Update loan amounts
    loan.amountPaid += parseFloat(amount);
    loan.lastPaymentDate = new Date();
    loan.updateBalance();
    
    // Update next payment date if not fully paid
    if (loan.status !== 'completed') {
      loan.nextPaymentDate = loan.calculateNextPaymentDate();
    }
    
    await loan.save();
    
    res.json({ message: 'Payment recorded successfully', loan });
  } catch (error) {
    res.status(500).json({ message: 'Failed to record payment', error: error.message });
  }
});

// Delete loan (when fully paid)
router.delete('/:id', auth, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    
    // Check access
    if (loan.owner.toString() !== req.user.userId && 
        loan.borrower.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Only allow deletion if loan is completed
    if (loan.status !== 'completed') {
      return res.status(400).json({ message: 'Can only delete completed loans' });
    }
    
    await Loan.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Loan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete loan', error: error.message });
  }
});

// Update loan status manually (owner only)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ message: 'Only owners can update loan status' });
    }
    
    const { lastPaymentDate, amountPaid } = req.body;
    
    const loan = await Loan.findById(req.params.id);
    
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found' });
    }
    
    if (loan.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Update loan
    if (lastPaymentDate) {
      loan.lastPaymentDate = new Date(lastPaymentDate);
    }
    
    if (amountPaid !== undefined) {
      loan.amountPaid = parseFloat(amountPaid);
      loan.updateBalance();
    }
    
    await loan.save();
    await loan.populate(['owner', 'borrower']);
    
    res.json({ message: 'Loan updated successfully', loan });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update loan', error: error.message });
  }
});

module.exports = router;