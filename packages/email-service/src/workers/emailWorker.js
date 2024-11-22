const handlePaymentRefunded = async (data) => {
  // In a real implementation, we'd fetch user email from user service
  const userEmail = 'customer@example.com';
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject: 'Refund Processed',
    html: `
      <h2>Refund Processed</h2>
      <p>A refund of $${data.refundAmount} ${data.currency.toUpperCase()} has been processed for your order.</p>
      <p>Payment Intent ID: ${data.paymentIntentId}</p>
      <p>The refund should appear in your account within 5-10 business days.</p>
      <p>If you have any questions, please contact our support team.</p>
    `
  };
  
  await transporter.sendMail(mailOptions);
  console.log(`Refund confirmation email sent for payment ${data.paymentIntentId}`);
};

module.exports = {
  connectToQueue,
  consumeFromQueue
};
