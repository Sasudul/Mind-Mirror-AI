import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

class EmailService:
    def __init__(self):
        self.smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.environ.get("SMTP_PORT", 587))
        self.smtp_username = os.environ.get("SMTP_USERNAME")
        self.smtp_password = os.environ.get("SMTP_PASSWORD")
        self.from_email = os.environ.get("FROM_EMAIL", "noreply@mindmirror.ai")

    def send_password_reset_email(self, to_email: str, reset_token: str, base_url: str = "http://localhost:4200"):
        reset_link = f"{base_url}/auth/reset-password?token={reset_token}"
        
        # In development, always log the reset link so the user can test without real SMTP
        logging.info(f"=========== PASSWORD RESET LINK ===========")
        logging.info(f"Target Email: {to_email}")
        logging.info(f"Click here to reset: {reset_link}")
        logging.info(f"===========================================")

        if not self.smtp_username or not self.smtp_password:
            logging.warning("SMTP credentials not configured. Email simulated in console only.")
            return True

        message = MIMEMultipart("alternative")
        message["Subject"] = "MindMirror AI - Password Reset Request"
        message["From"] = self.from_email
        message["To"] = to_email

        text = f"You requested a password reset for MindMirror AI. Please click the following link to reset your password:\n\n{reset_link}\n\nIf you did not request this, please ignore this email."
        
        html = f"""
        <html>
          <body>
            <h2>MindMirror AI Password Reset</h2>
            <p>You requested a password reset for your account.</p>
            <p>Please click the button below to set a new password:</p>
            <a href="{reset_link}" style="display:inline-block;padding:10px 20px;background-color:#FA520F;color:#ffffff;text-decoration:none;border-radius:4px;">Reset Password</a>
            <p><small>If you did not request this, please ignore this email.</small></p>
          </body>
        </html>
        """

        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html, "html")
        message.attach(part1)
        message.attach(part2)

        try:
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.sendmail(self.from_email, to_email, message.as_string())
            return True
        except Exception as e:
            logging.error(f"Failed to send email: {e}")
            return False

email_service = EmailService()
