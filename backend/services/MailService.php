<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

class MailService
{
    private string $logFile;
    private array $config;
    private string $frontendUrl;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../config/config.php';
        $logFile = $this->config['mail']['log_file'] ?? 'emails.log';
        $this->logFile = $this->resolveLogFile($logFile);
        $this->frontendUrl = rtrim($this->config['app']['frontend_url'] ?? '', '/');
    }

    public function send($to, $subject, $body)
    {
        $mode = $this->config['mail']['mode'] ?? 'log';

        if ($mode === 'log') {
            $timestamp = date('Y-m-d H:i:s');
            $content = "[$timestamp] TO: $to\nSUBJECT: $subject\nBODY:\n$body\n" . str_repeat("-", 50) . "\n\n";
            file_put_contents($this->logFile, $content, FILE_APPEND);
            return true;
        }

        if ($mode === 'smtp') {
            // Attempt 1: Using the configured port
            $success = $this->attemptSmtpSend($to, $subject, $body, $this->config['mail']['smtp']['port'], $this->config['mail']['smtp']['encryption']);
            
            // Attempt 2: Fallback to Port 587/TLS if the primary (usually 465) fails
            if (!$success && $this->config['mail']['smtp']['port'] != '587') {
                file_put_contents($this->logFile, "[" . date('Y-m-d H:i:s') . "] Primary SMTP failed. Attempting fallback to Port 587/TLS...\n", FILE_APPEND);
                $success = $this->attemptSmtpSend($to, $subject, $body, '587', 'tls');
            }

            return $success;
        }
        return true;
    }

    /**
     * Helper method to attempt SMTP sending with specific parameters
     */
    private function attemptSmtpSend($to, $subject, $body, $port, $encryption)
    {
        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->SMTPAuth   = true;
            $mail->Username   = $this->config['mail']['smtp']['username'];
            $mail->Password   = $this->config['mail']['smtp']['password'];
            
            $host = $this->config['mail']['smtp']['host'];
            $encryption = strtolower($encryption);
            
            if ($encryption === 'ssl' || $port == '465') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                if (!str_starts_with($host, 'ssl://')) { $host = 'ssl://' . $host; }
            } else {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            }

            $mail->Host       = $host;
            $mail->Port       = $port;
            $mail->Timeout    = 10; // Set a lower timeout for faster fallback
            $mail->SMTPKeepAlive = true;
            
            // Advanced Debugging (Logs directly to Railway)
            $mail->SMTPDebug  = 2; 
            $mail->Debugoutput = function($str, $level) {
                file_put_contents($this->logFile, "[" . date('Y-m-d H:i:s') . "] SMTP DEBUG: $str\n", FILE_APPEND);
            };

            $mail->SMTPOptions = [
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                ]
            ];

            $mail->setFrom($this->config['mail']['from'], $this->config['mail']['from_name']);
            $mail->addAddress($to);
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = !str_contains($body, '<') ? nl2br(htmlspecialchars($body)) : $body;

            $mail->send();
            return true;
        } catch (Throwable $e) {
            $errorMsg = ($e instanceof PHPMailerException) ? $mail->ErrorInfo : $e->getMessage();
            file_put_contents($this->logFile, "[" . date('Y-m-d H:i:s') . "] SMTP ERROR (Port $port): $errorMsg\n", FILE_APPEND);
            return false;
        }
    }

    public function sendActivationEmail($email, $displayName, $token)
    {
        $link = "{$this->frontendUrl}/activate?token=$token";
        $subject = "Verify your NoteMate account";
        $body = "
            <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1a202c; line-height: 1.6;'>
                <h1 style='text-align: center; color: #2d3748;'>Welcome to NoteMate</h1>
                <p>Hi <strong>$displayName</strong>,</p>
                <p>Please verify your email address by clicking the button below:</p>
                <div style='text-align: center; margin: 35px 0;'>
                    <a href='$link' style='background-color: #2d3748; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;'>Verify Email Address</a>
                </div>
                <p style='font-size: 12px; color: #a0aec0; text-align: center;'>&copy; " . date('Y') . " NoteMate.</p>
            </div>";
        return $this->send($email, $subject, $body);
    }

    public function sendResetPasswordEmail($email, $token, $otp)
    {
        $link = "{$this->frontendUrl}/reset-password?token=$token";
        $subject = "Reset your NoteMate password";
        $body = "
            <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1a202c; line-height: 1.6;'>
                <h1 style='text-align: center; color: #2d3748;'>Password Reset Request</h1>
                <p>You can reset your password by clicking below:</p>
                <div style='text-align: center; margin: 35px 0;'>
                    <a href='$link' style='background-color: #e53e3e; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;'>Reset Password</a>
                </div>
                <p style='text-align: center;'>Or use OTP: <strong style='font-size: 24px;'>$otp</strong></p>
                <p style='font-size: 12px; color: #a0aec0; text-align: center;'>&copy; " . date('Y') . " NoteMate.</p>
            </div>";
        return $this->send($email, $subject, $body);
    }

    public function sendShareNotificationEmail($recipientEmail, $senderName, $noteTitle, $role)
    {
        $roleLabel = ($role === 'edit') ? 'Editor' : 'Viewer';
        $subject = "Note Shared: $noteTitle";
        $body = "
            <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; color: #1a202c; line-height: 1.6;'>
                <h1 style='text-align: center; color: #2d3748;'>New Shared Note</h1>
                <p><strong>$senderName</strong> shared a note: <strong>$noteTitle</strong> ($roleLabel access).</p>
                <div style='text-align: center; margin: 35px 0;'>
                    <a href='{$this->frontendUrl}' style='background-color: #38a169; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;'>View Shared Note</a>
                </div>
            </div>";
        return $this->send($recipientEmail, $subject, $body);
    }

    private function resolveLogFile(string $logFile): string
    {
        return (preg_match('/^[A-Za-z]:\\\\|^\//', $logFile) === 1) ? $logFile : __DIR__ . '/../' . ltrim($logFile, '/\\');
    }
}
