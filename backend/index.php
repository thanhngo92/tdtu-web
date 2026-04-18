<?php

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