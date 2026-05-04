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
                $mail->SMTPAuth   = true;
                $mail->Username   = $this->config['mail']['smtp']['username'];
                $mail->Password   = $this->config['mail']['smtp']['password'];
                
                $host = $this->config['mail']['smtp']['host'];
                $encryption = strtolower($this->config['mail']['smtp']['encryption']);
                
                if ($encryption === 'ssl') {
                    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                    // For Port 465, many cloud environments require the ssl:// prefix
                    if (!str_starts_with($host, 'ssl://')) {
                        $host = 'ssl://' . $host;
                    }
                } else {
                    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                }

                $mail->Host       = $host;
                $mail->Port       = $this->config['mail']['smtp']['port'];
                $mail->Timeout    = 30;
                $mail->SMTPKeepAlive = true;
                
                // Aggressive SSL options for cloud compatibility
                $mail->SMTPOptions = [
                    'ssl' => [
                        'verify_peer' => false,
                        'verify_peer_name' => false,
                        'allow_self_signed' => true
                    ]
                ];

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
            } catch (Throwable $e) {
                $errorMsg = ($e instanceof PHPMailerException) ? $mail->ErrorInfo : $e->getMessage();
                $timestamp = date('Y-m-d H:i:s');
                $content = "[$timestamp] SMTP ERROR: $errorMsg\n" . str_repeat("-", 50) . "\n\n";
                file_put_contents($this->logFile, $content, FILE_APPEND);
                return false;
            }
        }

        return true;
    }

    public function sendActivationEmail($email, $displayName, $token)
    {
        $appUrl = rtrim($this->config['app']['frontend_url'] ?? '', '/');
        $link = "$appUrl/activate?token=$token";
        
        $subject = "Verify your NoteMate account";
        $body = "
            <div style='font-family: \"Segoe UI\", Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1a202c; line-height: 1.6;'>
                <div style='text-align: center; margin-bottom: 30px;'>
                    <h1 style='color: #2d3748; margin: 0; font-size: 24px;'>Welcome to NoteMate</h1>
                </div>
                <p style='font-size: 16px;'>Hi <strong>$displayName</strong>,</p>
                <p>Welcome to NoteMate! We're excited to have you on board. To get started and secure your account, please verify your email address by clicking the button below:</p>
                <div style='text-align: center; margin: 35px 0;'>
                    <a href='$link' style='background-color: #2d3748; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;'>Verify Email Address</a>
                </div>
                <p style='font-size: 14px; color: #718096;'>This link will expire in 24 hours. If you did not create a NoteMate account, no further action is required.</p>
                <hr style='border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;'>
                <p style='font-size: 12px; color: #a0aec0; text-align: center;'>&copy; " . date('Y') . " NoteMate. All rights reserved.</p>
            </div>
        ";
        
        return $this->send($email, $subject, $body);
    }

    public function sendResetPasswordEmail($email, $token, $otp)
    {
        $appUrl = rtrim($this->config['app']['frontend_url'] ?? '', '/');
        $link = "$appUrl/reset-password?token=$token";
        
        $subject = "Reset your NoteMate password";
        $body = "
            <div style='font-family: \"Segoe UI\", Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1a202c; line-height: 1.6;'>
                <div style='text-align: center; margin-bottom: 30px;'>
                    <h1 style='color: #2d3748; margin: 0; font-size: 24px;'>Password Reset Request</h1>
                </div>
                <p style='font-size: 16px;'>Hello,</p>
                <p>We received a request to reset your NoteMate password. You can complete the process by clicking the button below:</p>
                <div style='text-align: center; margin: 35px 0;'>
                    <a href='$link' style='background-color: #e53e3e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;'>Reset Password</a>
                </div>
                <p style='text-align: center; font-size: 15px;'>Or enter this 6-digit OTP code manually:</p>
                <p style='text-align: center; font-size: 28px; font-weight: bold; color: #2d3748; letter-spacing: 4px; margin: 10px 0;'>$otp</p>
                <p style='font-size: 14px; color: #718096;'>This link and code will expire in 15 minutes. If you did not request a password reset, you can safely ignore this email.</p>
                <hr style='border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;'>
                <p style='font-size: 12px; color: #a0aec0; text-align: center;'>&copy; " . date('Y') . " NoteMate. All rights reserved.</p>
            </div>
        ";
        
        return $this->send($email, $subject, $body);
    }

    public function sendShareNotificationEmail($recipientEmail, $senderName, $noteTitle, $role)
    {
        $roleLabel = ($role === 'edit') ? 'Editor' : 'Viewer';
        $subject = "Note Shared: $noteTitle";
        
        $body = "
            <div style='font-family: \"Segoe UI\", Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1a202c; line-height: 1.6;'>
                <div style='text-align: center; margin-bottom: 30px;'>
                    <h1 style='color: #2d3748; margin: 0; font-size: 24px;'>New Shared Note</h1>
                </div>
                <p style='font-size: 16px;'>Hello,</p>
                <p><strong>$senderName</strong> has shared a note with you titled: <strong style='color: #2d3748;'>$noteTitle</strong>.</p>
                <p>You have been given <strong>$roleLabel</strong> access.</p>
                <div style='text-align: center; margin: 35px 0;'>
                    <a href='{$this->config['app']['frontend_url']}' style='background-color: #38a169; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block;'>View Shared Note</a>
                </div>
                <p style='font-size: 14px; color: #718096;'>Log in to your account to start collaborating.</p>
                <hr style='border: 0; border-top: 1px solid #edf2f7; margin: 30px 0;'>
                <p style='font-size: 12px; color: #a0aec0; text-align: center;'>&copy; " . date('Y') . " NoteMate. All rights reserved.</p>
            </div>
        ";
        
        return $this->send($recipientEmail, $subject, $body);
    }

    private function resolveLogFile(string $logFile): string
    {
        if (preg_match('/^[A-Za-z]:\\\\|^\//', $logFile) === 1) {
            return $logFile;
        }

        return __DIR__ . '/../../' . ltrim($logFile, '/\\');
    }
}
