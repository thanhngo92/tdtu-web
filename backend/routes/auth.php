<?php

require_once __DIR__ . '/../controllers/AuthController.php';

$router->post('/api/auth/register', [AuthController::class, 'register']);
$router->post('/api/auth/activate', [AuthController::class, 'activate']);
$router->post('/api/auth/login', [AuthController::class, 'login']);
$router->post('/api/auth/logout', [AuthController::class, 'logout']);
$router->post('/api/auth/forgot-password', [AuthController::class, 'forgotPassword']);
$router->post('/api/auth/reset-password', [AuthController::class, 'resetPassword']);
$router->post('/api/auth/reset-password-otp', [AuthController::class, 'resetPasswordOtp']);