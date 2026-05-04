<?php
require_once __DIR__ . '/backend/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;

try {
    $mail = new PHPMailer(true);
    echo "SUCCESS: PHPMailer class found and instantiated!\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
