<?php

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

        if ($mode !== 'log') {
            return true;
        }

        // For development, we log emails to a file instead of sending
        $timestamp = date('Y-m-d H:i:s');
        $content = "[$timestamp] TO: $to\nSUBJECT: $subject\nBODY:\n$body\n" . str_repeat("-", 50) . "\n\n";
        
        file_put_contents($this->logFile, $content, FILE_APPEND);
        
        // In production, you would use:
        // return mail($to, $subject, $body, "From: noreply@notesapp.com");
        
        return true;
    }

    public function sendActivationEmail($email, $displayName, $token)
    {
        $appUrl = rtrim($this->config['app']['frontend_url'] ?? '', '/');
        $link = "$appUrl/activate?token=$token";
        
        $subject = "Activate Your Notes App Account";
        $body = "Hello $displayName,\n\n" .
                "Thank you for registering. Please click the link below to activate your account:\n" .
                "$link\n\n" .
                "If you did not register for this account, please ignore this email.";
        
        $this->send($email, $subject, $body);
        return $link;
    }

    public function sendResetPasswordEmail($email, $token, $otp)
    {
        $appUrl = rtrim($this->config['app']['frontend_url'] ?? '', '/');
        $link = "$appUrl/reset-password?token=$token";
        
        $subject = "Reset Your Notes App Password";
        $body = "Hello,\n\n" .
                "You requested to reset your password. You can use the link or OTP below:\n" .
                "Link: $link\n" .
                "OTP: $otp\n\n" .
                "This code will expire in 15 minutes.\n" .
                "If you did not request this, please ignore this email.";
        
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
