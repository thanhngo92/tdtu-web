<?php

$config = require __DIR__ . '/config/config.php';

$corsOrigin = $config['cors']['allowed_origin'];

header("Access-Control-Allow-Origin: $corsOrigin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

session_name($config['session']['name']);

session_set_cookie_params([
    'lifetime' => 0,
    'path' => $config['session']['path'],
    'domain' => $config['session']['domain'],
    'secure' => $config['session']['secure'],
    'httponly' => $config['session']['httponly'],
    'samesite' => $config['session']['samesite'],
]);

session_start();

require_once __DIR__ . '/core/Database.php';
require_once __DIR__ . '/core/Request.php';
require_once __DIR__ . '/core/Response.php';
require_once __DIR__ . '/core/Router.php';

$database = new Database();
$conn = $database->connect();

$router = new Router($conn);

require_once __DIR__ . '/routes/auth.php';
require_once __DIR__ . '/routes/user.php';
require_once __DIR__ . '/routes/note.php';
require_once __DIR__ . '/routes/label.php';

$router->resolve();