<?php

require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../core/Response.php';
require_once __DIR__ . '/../services/AuthService.php';
require_once __DIR__ . '/../services/UserService.php';

class UserController extends Controller
{
    private AuthService $authService;
    private UserService $userService;

    public function __construct(PDO $conn)
    {
        parent::__construct($conn);
        $this->authService = new AuthService($conn);
        $this->userService = new UserService($conn);
    }

    public function me($request, $response)
    {
        try {
            $user = $this->authService->getCurrentUser();
            return $this->success($response, $user, 200);
        } catch (Throwable $e) {
            $code = $e->getCode();
            $status = ($code >= 400 && $code < 600) ? $code : 500;
            return $this->error($response, $e->getMessage(), $status);
        }
    }

    public function updateProfile($request, $response)
    {
        try {
            $user = $this->authService->getCurrentUser();
            $userId = $user['id'];
            
            $body = $request->getBody();
            $displayName = trim($body['displayName'] ?? '');
            $avatarUrl = $body['avatarUrl'] ?? null;

            $user = $this->userService->updateProfile($userId, $displayName, $avatarUrl);

            return $this->success($response, [
                'message' => 'Profile updated successfully',
                'user' => $user
            ], 200);
        } catch (Throwable $e) {
            $code = $e->getCode();
            $status = ($code >= 400 && $code < 600) ? $code : 500;
            return $this->error($response, $e->getMessage(), $status);
        }
    }

    public function changePassword($request, $response)
    {
        try {
            $user = $this->authService->getCurrentUser();
            $userId = $user['id'];
            
            $body = $request->getBody();
            $currentPassword = $body['currentPassword'] ?? '';
            $newPassword = $body['newPassword'] ?? '';
            $confirmPassword = $body['confirmPassword'] ?? '';

            $result = $this->userService->changePassword($userId, $currentPassword, $newPassword, $confirmPassword);

            return $this->success($response, $result, 200);
        } catch (Throwable $e) {
            $code = $e->getCode();
            $status = ($code >= 400 && $code < 600) ? $code : 500;
            return $this->error($response, $e->getMessage(), $status);
        }
    }

    public function updatePreferences($request, $response)
    {
        try {
            $user = $this->authService->getCurrentUser();
            $userId = $user['id'];
            
            $body = $request->getBody();
            $theme = $body['theme'] ?? 'light';
            $fontSize = $body['fontSize'] ?? 14;
            $noteColor = $body['noteColor'] ?? 'default';

            $result = $this->userService->updatePreferences($userId, $theme, $fontSize, $noteColor);

            return $this->success($response, $result, 200);
        } catch (Throwable $e) {
            $code = $e->getCode();
            $status = ($code >= 400 && $code < 600) ? $code : 500;
            return $this->error($response, $e->getMessage(), $status);
        }
    }
}
