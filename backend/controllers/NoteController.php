<?php

require_once __DIR__ . '/../core/Controller.php';
require_once __DIR__ . '/../services/NoteService.php';
require_once __DIR__ . '/../middleware/AuthMiddleware.php';

class NoteController extends Controller
{
    private NoteService $noteService;

    public function __construct(PDO $db)
    {
        parent::__construct($db);
        $this->noteService = new NoteService($db);
    }

    public function index($request, $response)
    {
        AuthMiddleware::auth($response);
        $userId = $_SESSION['user_id'];
        
        try {
            $notes = $this->noteService->getAllNotes($userId);
            return $this->success($response, $notes);
        } catch (Exception $e) {
            return $this->error($response, $e->getMessage(), $e->getCode() ?: 500);
        }
    }

    public function show($request, $response)
    {
        AuthMiddleware::auth($response);
        $userId = $_SESSION['user_id'];
        $id = $request->getParam('id');
        
        try {
            $note = $this->noteService->getNote($id, $userId);
            return $this->success($response, $note);
        } catch (Exception $e) {
            return $this->error($response, $e->getMessage(), $e->getCode() ?: 500);
        }
    }

    public function store($request, $response)
    {
        AuthMiddleware::auth($response);
        $userId = $_SESSION['user_id'];
        $data = $request->getBody();

        try {
            $note = $this->noteService->createNote($userId, $data);
            return $this->success($response, $note, 201);
        } catch (Exception $e) {
            return $this->error($response, $e->getMessage(), $e->getCode() ?: 500);
        }
    }

    public function update($request, $response)
    {
        AuthMiddleware::auth($response);
        $userId = $_SESSION['user_id'];
        $id = $request->getParam('id');
        $data = $request->getBody();

        try {
            $note = $this->noteService->updateNote($id, $userId, $data);
            return $this->success($response, $note);
        } catch (Exception $e) {
            return $this->error($response, $e->getMessage(), $e->getCode() ?: 500);
        }
    }

    public function destroy($request, $response)
    {
        AuthMiddleware::auth($response);
        $userId = $_SESSION['user_id'];
        $id = $request->getParam('id');
        $body = $request->getBody();
        $password = $body['password'] ?? null;

        try {
            $this->noteService->deleteNote($id, $userId, $password);
            return $this->success($response, ['message' => 'Note deleted']);
        } catch (Exception $e) {
            return $this->error($response, $e->getMessage(), $e->getCode() ?: 500);
        }
    }

    public function togglePin($request, $response)
    {
        AuthMiddleware::auth($response);
        $userId = $_SESSION['user_id'];
        $id = $request->getParam('id');

        try {
            $result = $this->noteService->togglePin($id, $userId);
            return $this->success($response, $result);
        } catch (Exception $e) {
            return $this->error($response, $e->getMessage(), $e->getCode() ?: 500);
        }
    }

    public function setLock($request, $response)
    {
        AuthMiddleware::auth($response);
        $userId = $_SESSION['user_id'];
        $id = $request->getParam('id');
        $body = $request->getBody();

        try {
            $result = $this->noteService->setLock($id, $userId, $body);
            return $this->success($response, $result);
        } catch (Exception $e) {
            return $this->error($response, $e->getMessage(), $e->getCode() ?: 500);
        }
    }

    public function verifyPassword($request, $response)
    {
        AuthMiddleware::auth($response);
        $userId = $_SESSION['user_id'];
        $id = $request->getParam('id');
        $body = $request->getBody();
        $password = $body['password'] ?? '';

        try {
            $note = $this->noteService->verifyPassword($id, $userId, $password);
            return $this->success($response, $note);
        } catch (Exception $e) {
            return $this->error($response, $e->getMessage(), $e->getCode() ?: 500);
        }
    }

    public function fetchShared($request, $response)
    {
        AuthMiddleware::auth($response);
        $userId = $_SESSION['user_id'];

        try {
            $sharedNotes = $this->noteService->getSharedNotes($userId);
            return $this->success($response, $sharedNotes);
        } catch (Exception $e) {
            return $this->error($response, $e->getMessage(), $e->getCode() ?: 500);
        }
    }

    public function share($request, $response)
    {
        AuthMiddleware::auth($response);
        $userId = $_SESSION['user_id'];
        $id = $request->getParam('id');
        $body = $request->getBody();
        $email = $body['email'] ?? '';
        $role = $body['role'] ?? 'read';

        try {
            $this->noteService->shareNote($id, $userId, $email, $role);
            return $this->success($response, ['message' => 'Note shared successfully']);
        } catch (Exception $e) {
            return $this->error($response, $e->getMessage(), $e->getCode() ?: 500);
        }
    }

    public function revokeShare($request, $response)
    {
        AuthMiddleware::auth($response);
        $userId = $_SESSION['user_id'];
        $id = $request->getParam('id');
        $body = $request->getBody();
        $email = $body['email'] ?? '';

        try {
            $this->noteService->revokeShare($id, $userId, $email);
            return $this->success($response, ['message' => 'Share revoked']);
        } catch (Exception $e) {
            return $this->error($response, $e->getMessage(), $e->getCode() ?: 500);
        }
    }
}
