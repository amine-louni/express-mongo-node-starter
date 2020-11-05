const nodeMailer = require('nodemailer');

const neh = require('nodemailer-express-handlebars');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `${process.env.EMAIL_FROM}`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Sending real email
      return nodeMailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }
    // 1) Create a transporter
    return nodeMailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    // Send the actual email
    // 1 )  Render the HTML based on Handlebar template

    // 2 )  Define ehe Email Options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      template,
      context: {
        firstName: this.firstName,
        url: this.url,
        subject,
      },
      // text: htmlToText.fromString(html),
    };
    // 2 )  Create a transport and send email
    await this.newTransport()
      .use(
        'compile',
        neh({
          viewEngine: {
            defaultLayout: null,
          },
          viewPath: `${__dirname}/../views/emails/`,
          extName: '.hbs',
        })
      )
      .sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Thank you for joining us');
  }

  async sendPasswordReset() {
    await this.send('passwordReset', 'Valid only for 10 min');
  }
};
