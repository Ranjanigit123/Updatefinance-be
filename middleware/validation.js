const validateRegistration = (req, res, next) => {
  const { name, email, mobile, gpayAccess, password, confirmPassword, role } = req.body;
  
  // Basic validation
  if (!name || !email || !mobile || !gpayAccess || !password || !confirmPassword || !role) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }
  
  // Password validation
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }
  
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }
  
  // Role validation
  if (!['owner', 'borrower'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role specified' });
  }
  
  // Role-specific validation
  if (role === 'owner' && !req.body.qrCode) {
    return res.status(400).json({ message: 'QR code is required for owners' });
  }
  
  if (role === 'borrower') {
    const { address, bankName, accountHolderName, photo } = req.body;
    if (!address || !bankName || !accountHolderName || !photo) {
      return res.status(400).json({ 
        message: 'Address, bank name, account holder name, and photo are required for borrowers' 
      });
    }
  }
  
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }
  
  next();
};

module.exports = {
  validateRegistration,
  validateLogin
};