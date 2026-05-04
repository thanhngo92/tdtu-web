<?php

$envPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';

if (is_file($envPath) && is_readable($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach ($lines as $line) {
        $line = trim($line);

        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);

        if ($name === '' || getenv($name) !== false) {
            continue;
        }

        putenv("$name=$value");
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
    }
}

// Dynamic Host Detection for multi-device testing (LAN)
$serverHost = $_SERVER['HTTP_HOST'] ?? 'localhost:8000';
$serverIp = explode(':', $serverHost)[0];
$defaultFrontendUrl = "http://$serverIp:5173";

return [
    'db' => [
        'host' => getenv('DB_HOST') ?: (getenv('MYSQLHOST') ?: 'localhost'),
        'port' => getenv('DB_PORT') ?: (getenv('MYSQLPORT') ?: '3306'),
        'dbname' => getenv('DB_NAME') ?: (getenv('MYSQLDATABASE') ?: 'notes_app'),
        'username' => getenv('DB_USER') ?: (getenv('MYSQLUSER') ?: 'root'),
        'password' => getenv('DB_PASS') ?: (getenv('MYSQLPASSWORD') ?: ''),
    ],
    'app' => [
        'url' => getenv('APP_URL') ?: "http://$serverHost",
        'frontend_url' => getenv('FRONTEND_URL') ?: $defaultFrontendUrl,
        'debug' => filter_var(getenv('APP_DEBUG') ?: 'true', FILTER_VALIDATE_BOOLEAN),
    ],
    'mail' => [
        'mode' => getenv('MAIL_MODE') ?: 'log',
        'from' => getenv('MAIL_FROM') ?: 'noreply@notemate.local',
        'from_name' => getenv('MAIL_FROM_NAME') ?: 'NoteMate',
        'resend_api_key' => getenv('RESEND_API_KEY'),
        'log_file' => getenv('MAIL_LOG_FILE') ?: 'emails.log',
        'smtp' => [
            'host' => getenv('SMTP_HOST') ?: 'smtp.mailtrap.io',
            'port' => getenv('SMTP_PORT') ?: '2525',
            'username' => getenv('SMTP_USER') ?: '',
            'password' => getenv('SMTP_PASS') ?: '',
            'encryption' => getenv('SMTP_ENCRYPTION') ?: 'tls',
        ]
    ],
    'session' => [
        'name' => getenv('SESSION_NAME') ?: 'notemate_session',
        'secure' => filter_var(getenv('SESSION_SECURE') ?: 'false', FILTER_VALIDATE_BOOLEAN),
        'httponly' => true,
        'samesite' => getenv('SESSION_SAMESITE') ?: 'Lax',
        'path' => '/',
        'domain' => getenv('SESSION_DOMAIN') ?: '',
    ],
    'cors' => [
        'allowed_origin' => getenv('CORS_ALLOWED_ORIGIN') ?: $defaultFrontendUrl,
        'allow_credentials' => true,
    ],
];