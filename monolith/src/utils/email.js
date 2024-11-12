const nodemailer = require('nodemailer');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.firstName;
    this.url = url;
    this.from = `LemonStand <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async send(html, subject) {
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html
    };

    await this.newTransport().sendMail(mailOptions);
  }

  async sendEmailVerification() {
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Verify Your Email Address</h2>
        <p>Hello ${this.firstName},</p>
        <p>Thank you for registering with LemonStand. Please verify your email address by clicking the link below:</p>
        <p><a href="${this.url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a></p>
        <p>If you did not create an account, please ignore this email.</p>
        <p>Best regards,<br>The LemonStand Team</p>
      </div>
    `;
    await this.send(html, 'Verify Your Email for LemonStand');
  }

  async sendPasswordReset() {
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Reset Your Password</h2>
        <p>Hello ${this.firstName},</p>
        <p>You requested to reset your password. Click the link below to reset it:</p>
        <p><a href="${this.url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
        <p>This link is valid for 10 minutes. If you didn't request a password reset, please ignore this email.</p>
        <p>Best regards,<br>The LemonStand Team</p>
      </div>
    `;
    await this.send(html, 'Reset Your LemonStand Password');
  }
};
