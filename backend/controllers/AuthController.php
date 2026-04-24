<?php

require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../services/AuthService.php';

class AuthController extends Controller
{
    private AuthService $authService;

    public function __construct(PDO $conn)
    {
        parent::__construct($conn);
        $this->authService = new AuthService($conn);
    }

    public function register($request, $response)
    {
        try {
            $body = $request->getBody();

            $email = trim($body['email'] ?? '');
            $displayName = trim($body['displayName'] ?? '');
            $password = $body['password'] ?? '';
            $confirmPassword = $body['confirmPassword'] ?? '';

            $result = $this->authService->register($email, $displayName, $password, $confirmPassword);

            return $this->success($response, $result, 201);
        } catch (Exception $e) {
            $code = $e->getCode();
            $status = ($code >= 400 && $code < 600) ? $code : 500;
            return $this->error($response, $e->getMessage(), $status);
        }
    }

    public function activate($request, $response)
    {
        try {
            $body = $request->getBody();
            $token = trim($body['token'] ?? '');

            $result = $this->authService->activate($token);

            return $this->success($response, $result, 200);
        } catch (Exception $e) {
            $code = $e->getCode();
            $status = ($code >= 400 && $code < 600) ? $code : 500;
            return $this->error($response, $e->getMessage(), $status);
        }
    }

    public function login($request, $response)
    {
        try {
            $body = $request->getBody();

            $email = trim($body['email'] ?? '');
            $password = $body['password'] ?? '';

            if ($email === '' || $password === '') {
                return $this->error($response, 'Email and password are required', 422);
            }

            $user = $this->authService->login($email, $password);

            return $this->success($response, [
                'message' => 'Login successful',
                'user' => $user
            ], 200);
        } catch (Exception $e) {
            $code = $e->getCode();
            $status = ($code >= 400 && $code < 600) ? $code : 500;
            return $this->error($response, $e->getMessage(), $status);
        }
    }

    public function logout($request, $response)
    {
        try {
            $this->authService->logout();

            return $this->success($response, [
                'message' => 'Logout successful'
            ], 200);
        } catch (Exception $e) {
            return $this->error($response, 'Logout failed', 500);
        }
    }

    public function forgotPassword($request, $response)
    {
        try {
            $body = $request->getBody();
            $email = trim($body['email'] ?? '');

            $result = $this->authService->forgotPassword($email);

            return $this->success($response, $result, 200);
        } catch (Exception $e) {
            $code = $e->getCode();
            $status = ($code >= 400 && $code < 600) ? $code : 500;
            return $this->error($response, $e->getMessage(), $status);
        }
    }

    public function resetPassword($request, $response)
    {
        try {
            $body = $request->getBody();

            $token = trim($body['token'] ?? '');
            $password = $body['password'] ?? '';
            $confirmPassword = $body['confirmPassword'] ?? '';

            $result = $this->authService->resetPassword($token, $password, $confirmPassword);

            return $this->success($response, $result, 200);
        } catch (Exception $e) {
            $code = $e->getCode();
            $status = ($code >= 400 && $code < 600) ? $code : 500;
            return $this->error($response, $e->getMessage(), $status);
        }
    }

    public function resetPasswordOtp($request, $response)
    {
        try {
            $body = $request->getBody();

            $email = trim($body['email'] ?? '');
            $otp = trim($body['otp'] ?? '');
            $password = $body['password'] ?? '';
            $confirmPassword = $body['confirmPassword'] ?? '';

            $result = $this->authService->resetPasswordOtp($email, $otp, $password, $confirmPassword);

            return $this->success($response, $result, 200);
        } catch (Exception $e) {
            $code = $e->getCode();
            $status = ($code >= 400 && $code < 600) ? $code : 500;
            return $this->error($response, $e->getMessage(), $status);
        }
    }
}
