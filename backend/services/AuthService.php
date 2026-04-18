<?php

require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../services/MailService.php';

class AuthService
{
    private User $userModel;
    private MailService $mailService;

    public function __construct(\PDO $conn)
    {
        $this->userModel = new User($conn);
        $this->mailService = new MailService();
    }

    public function login($email, $password)
    {
        $user = $this->userModel->findByEmail($email);

        if (!$user) {
            throw new Exception('Invalid email or password', 401);
        }

        if (!password_verify($password, $user['password_hash'])) {
            throw new Exception('Invalid email or password', 401);
        }

        if (!$user['is_activated']) {
            throw new Exception('Account not activated. Please check your email.', 403);
        }

        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];

        return $this->sanitizeUser($user);
    }

    public function logout()
    {
        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }

        session_destroy();

        return true;
    }

    public function register($email, $displayName, $password, $confirmPassword)
    {
        if ($email === '' || $displayName === '' || $password === '' || $confirmPassword === '') {
            throw new Exception('Email, display name, password and confirm password are required', 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email format', 422);
        }

        if ($password !== $confirmPassword) {
            throw new Exception('Password and confirm password do not match', 422);
        }

        $existingUser = $this->userModel->findByEmail($email);
        if ($existingUser) {
            throw new Exception('Email already exists', 409);
        }

        $userId = $this->userModel->create($email, $displayName, $password);

        $token = bin2hex(random_bytes(32));
        $expires = date('Y-m-d H:i:s', strtotime('+24 hours'));

        $this->userModel->saveActivationToken($userId, $token, $expires);

        // Send actual activation email simulation
        $this->mailService->sendActivationEmail($email, $displayName, $token);

        $user = $this->userModel->getById($userId);
        
        // Auto-login after registration as per requirement
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        
        return [
            'message' => 'Registration successful. Please check your email for activation link.',
            'user' => $this->sanitizeUser($user)
        ];
    }

    public function activate($token)
    {
        if (trim($token) === '') {
            throw new Exception('Activation token is required', 422);
        }

        $activated = $this->userModel->activateAccount($token);

        if (!$activated) {
            throw new Exception('Invalid or expired activation token', 400);
        }

        return [
            'message' => 'Account activated successfully'
        ];
    }

    public function forgotPassword($email)
    {
        if (trim($email) === '') {
            throw new Exception('Email is required', 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email format', 422);
        }

        $user = $this->userModel->findByEmail($email);

        if (!$user) {
            // Security: don't reveal if user exists, but here we keep it simple or follow the PDF
            return [
                'message' => 'If the email exists, reset instructions have been sent.'
            ];
        }

        $token = bin2hex(random_bytes(32));
        $otp = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));

        $this->userModel->saveResetToken($email, $token, $otp, $expires);

        // Send actual reset email simulation
        $this->mailService->sendResetPasswordEmail($email, $token, $otp);

        return [
            'message' => 'Reset instructions have been sent to your email.'
        ];
    }

    public function resetPassword($token, $password, $confirmPassword)
    {
        if (trim($token) === '' || $password === '' || $confirmPassword === '') {
            throw new Exception('Token, password and confirm password are required', 422);
        }

        if ($password !== $confirmPassword) {
            throw new Exception('Password and confirm password do not match', 422);
        }

        $user = $this->userModel->findByResetToken($token);

        if (!$user) {
            throw new Exception('Invalid or expired reset token', 400);
        }

        $this->userModel->resetPassword($user['id'], $password);

        return [
            'message' => 'Password reset successful. Please login again.'
        ];
    }

    public function resetPasswordOtp($email, $otp, $password, $confirmPassword)
    {
        if (trim($email) === '' || trim($otp) === '' || $password === '' || $confirmPassword === '') {
            throw new Exception('Email, OTP, password and confirm password are required', 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email format', 422);
        }

        if ($password !== $confirmPassword) {
            throw new Exception('Password and confirm password do not match', 422);
        }

        $user = $this->userModel->findByResetOtp($email, $otp);

        if (!$user) {
            throw new Exception('Invalid or expired OTP', 400);
        }

        $this->userModel->resetPassword($user['id'], $password);

        return [
            'message' => 'Password reset successful. Please login again.'
        ];
    }

    public function getCurrentUser()
    {
        if (empty($_SESSION['user_id'])) {
            throw new Exception('Unauthorized', 401);
        }

        $user = $this->userModel->getById($_SESSION['user_id']);

        if (!$user) {
            unset($_SESSION['user_id']);
            throw new Exception('Unauthorized', 401);
        }

        return $this->sanitizeUser($user);
    }

    private function sanitizeUser($user)
    {
        return [
            'id' => (int)$user['id'],
            'email' => $user['email'],
            'displayName' => $user['display_name'],
            'isActivated' => (bool)$user['is_activated'],
            'avatarUrl' => $user['avatar_url'],
            'preferences' => [
                'theme' => $user['theme'],
                'fontSize' => (int)$user['font_size'],
                'noteColor' => $user['note_color'],
            ],
            'createdAt' => $user['created_at'] ?? null,
            'updatedAt' => $user['updated_at'] ?? null,
        ];
    }
}