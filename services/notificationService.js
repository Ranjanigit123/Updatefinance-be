const nodemailer = require('nodemailer');
const cron = require('node-cron');
const Loan = require('../models/Loan');

class NotificationService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  
  async sendEmail(to, subject, html) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html
      };
      
      await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}`);
    } catch (error) {
      console.error('Email sending failed:', error);
    }
  }
  
  async sendBorrowerReminder(loan) {
    const subject = 'Payment Reminder - Finance App';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">Payment Reminder</h2>
        <p>Dear ${loan.borrower.name},</p>
        <p>This is a reminder that your monthly payment is due in one week.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Payment Details:</h3>
          <p><strong>Owner:</strong> ${loan.owner.name}</p>
          <p><strong>Owner Email:</strong> ${loan.owner.email}</p>
          <p><strong>Monthly Amount:</strong> ₹${loan.monthlyAmount.toLocaleString()}</p>
          <p><strong>Due Date:</strong> ${loan.nextPaymentDate.toLocaleDateString()}</p>
          <p><strong>Balance Amount:</strong> ₹${loan.balanceAmount.toLocaleString()}</p>
          <p><strong>GPay Mobile:</strong> ${loan.owner.gpayAccess}</p>
        </div>
        
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4>Payment Instructions:</h4>
          <p>You can make the payment using the owner's QR code or GPay mobile number provided above.</p>
          <p><strong>Important:</strong> After making the payment, please send a screenshot to the owner's email: ${loan.owner.email}</p>
        </div>
        
        <p>Thank you for your prompt attention to this matter.</p>
        <p>Best regards,<br>Finance App Team</p>
      </div>
    `;
    
    await this.sendEmail(loan.borrower.email, subject, html);
  }
  
  async sendOwnerNotification(loan) {
    const subject = 'Payment Due Today - Finance App';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196F3;">Payment Due Notification</h2>
        <p>Dear ${loan.owner.name},</p>
        <p>This is to inform you that a monthly payment is due today.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Payment Details:</h3>
          <p><strong>Borrower:</strong> ${loan.borrower.name}</p>
          <p><strong>Borrower Email:</strong> ${loan.borrower.email}</p>
          <p><strong>Monthly Amount:</strong> ₹${loan.monthlyAmount.toLocaleString()}</p>
          <p><strong>Due Date:</strong> ${loan.nextPaymentDate.toLocaleDateString()}</p>
          <p><strong>Balance Amount:</strong> ₹${loan.balanceAmount.toLocaleString()}</p>
        </div>
        
        <p>Please check your payment methods for any incoming payments.</p>
        <p>Best regards,<br>Finance App Team</p>
      </div>
    `;
    
    await this.sendEmail(loan.owner.email, subject, html);
  }
  
  async checkUpcomingPayments() {
    try {
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
      
      const upcomingLoans = await Loan.find({
        status: 'active',
        nextPaymentDate: {
          $gte: new Date(),
          $lte: oneWeekFromNow
        }
      }).populate(['owner', 'borrower']);
      
      for (const loan of upcomingLoans) {
        await this.sendBorrowerReminder(loan);
      }
      
      console.log(`Sent ${upcomingLoans.length} payment reminders`);
    } catch (error) {
      console.error('Error checking upcoming payments:', error);
    }
  }
  
  async checkDuePayments() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dueLoans = await Loan.find({
        status: 'active',
        nextPaymentDate: {
          $gte: today,
          $lt: tomorrow
        }
      }).populate(['owner', 'borrower']);
      
      for (const loan of dueLoans) {
        await this.sendOwnerNotification(loan);
      }
      
      console.log(`Sent ${dueLoans.length} due payment notifications`);
    } catch (error) {
      console.error('Error checking due payments:', error);
    }
  }
  
  startScheduler() {
    // Send borrower reminders daily at 9 AM
    cron.schedule('0 9 * * *', () => {
      console.log('Checking for upcoming payments...');
      this.checkUpcomingPayments();
    });
    
    // Send owner notifications daily at 9 AM
    cron.schedule('0 9 * * *', () => {
      console.log('Checking for due payments...');
      this.checkDuePayments();
    });
    
    console.log('Notification scheduler started');
  }
}

module.exports = new NotificationService();