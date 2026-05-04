<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

class MailService
{
    private string $logFile;
    private array $config;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../config/config.php';
        $logFile = $this->config['mail']['log_file'] ?? 'emails.log';
        $this->logFile = $this->resolveLogFile($logFile);
    }

    public function send($to, $subject, $body)
    {
        $mode = $this->config['mail']['mode'] ?? 'log';

        if ($mode === 'log') {
            // For development, we log emails to a file instead of sending
            $timestamp = date('Y-m-d H:i:s');
            $content = "[$timestamp] TO: $to\nSUBJECT: $subject\nBODY:\n$body\n" . str_repeat("-", 50) . "\n\n";
            file_put_contents($this->logFile, $content, FILE_APPEND);
            return true;
        }

        if ($mode === 'smtp') {
            $mail = new PHPMailer(true);

            try {
                // Server settings
                $mail->isSMTP();
                $mail->Host       = $this->config['mail']['smtp']['host'];
                $mail->SMTPAuth   = true;
                $mail->Username   = $this->config['mail']['smtp']['username'];
                $mail->Password   = $this->config['mail']['smtp']['password'];
                $mail->SMTPSecure = $this->config['mail']['smtp']['encryption'];
                $mail->Port       = $this->config['mail']['smtp']['port'];

                // Recipients
                $mail->setFrom($this->config['mail']['from'], $this->config['mail']['from_name']);
                $mail->addAddress($to);

                // Content
                $mail->isHTML(true);
                $mail->Subject = $subject;
                
                // Convert plain text body to HTML if it doesn't look like HTML
                if (!str_contains($body, '<')) {
                    $htmlBody = nl2br(htmlspecialchars($body));
                } else {
                    $htmlBody = $body;
                }
                
                $mail->Body = $htmlBody;

                $mail->send();
                return true;
            } catch (PHPMailerException $e) {
                error_log("Mail sending failed: {$mail->ErrorInfo}");
                throw new Exception("Message could not be sent. Mailer Error: {$mail->ErrorInfo}");
            }
        }

        return true;
    }

    public function sendActivationEmail($email, $displayName, $token)
    {
        $appUrl = rtrim($this->config['app']['frontend_url'] ?? '', '/');
        $link = "$appUrl/activate?token=$token";
        
        $subject = "Activate Your NoteMate Account";
        $body = "
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;'>
                <h2 style='color: #2d3748;'>Welcome to NoteMate!</h2>
                <p>Hello <strong>$displayName</strong>,</p>
                <p>Thank you for joining our community. To get started, please verify your email address by clicking the button below:</p>
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='$link' style='background-color: #4a5568; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Activate Account</a>
                </div>
                <p style='font-size: 0.8em; color: #718096;'>If the button doesn't work, copy and paste this link into your browser:<br>$link</p>
                <hr style='border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;'>
                <p style='font-size: 0.8em; color: #a0aec0;'>If you did not register for this account, please ignore this email.</p>
            </div>
        ";
        
        $this->send($email, $subject, $body);
        return $link;
    }

    public function sendResetPasswordEmail($email, $token, $otp)
    {
        $appUrl = rtrim($this->config['app']['frontend_url'] ?? '', '/');
        $link = "$appUrl/reset-password?token=$token";
        
        $subject = "Reset Your NoteMate Password";
        $body = "
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;'>
                <h2 style='color: #2d3748;'>Password Reset Request</h2>
                <p>Hello,</p>
                <p>We received a request to reset your password. You can use the link below or enter the OTP manually:</p>
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='$link' style='background-color: #e53e3e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Reset Password</a>
                </div>
                <p style='text-align: center; font-size: 1.2em;'>Your OTP: <strong style='color: #e53e3e; letter-spacing: 2px;'>$otp</strong></p>
                <p style='font-size: 0.8em; color: #718096; margin-top: 20px;'>The link and OTP will expire in 15 minutes.</p>
                <hr style='border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;'>
                <p style='font-size: 0.8em; color: #a0aec0;'>If you did not request this, please ignore this email.</p>
            </div>
        ";
        
        $this->send($email, $subject, $body);
        return $link;
    }

    private function resolveLogFile(string $logFile): string
    {
        if (preg_match('/^[A-Za-z]:\\\\|^\//', $logFile) === 1) {
            return $logFile;
        }

        return __DIR__ . '/../../' . ltrim($logFile, '/\\');
    }
}
