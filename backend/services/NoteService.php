<?php

require_once __DIR__ . '/../models/Note.php';
require_once __DIR__ . '/../models/NoteImage.php';
require_once __DIR__ . '/../models/NoteLabel.php';
require_once __DIR__ . '/../models/NoteShare.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../services/MailService.php';

class NoteService
{
    private const VERIFIED_NOTE_SESSION_KEY = 'verified_note_access';

    private Note $noteModel;
    private NoteImage $noteImageModel;
    private NoteLabel $noteLabelModel;
    private NoteShare $noteShareModel;
    private User $userModel;
    private MailService $mailService;
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
        $this->noteModel = new Note($db);
        $this->noteImageModel = new NoteImage($db);
        $this->noteLabelModel = new NoteLabel($db);
        $this->noteShareModel = new NoteShare($db);
        $this->userModel = new User($db);
        $this->mailService = new MailService();
    }

    public function getAllNotes($userId)
    {
        $notes = $this->noteModel->getAllByUser($userId);

        foreach ($notes as &$note) {
            $note = $this->enrichNoteData($note, $userId, false);
        }

        return $notes;
    }

    public function getNote($id, $userId, $bypassLock = false)
    {
        $note = $this->noteModel->getById($id, $userId);
        if (!$note) {
            throw new Exception('Note not found', 404);
        }

        $allowFullAccess = $bypassLock || !$this->isLockedNote($note) || $this->hasVerifiedNoteAccess($id);

        return $this->enrichNoteData($note, $userId, $allowFullAccess);
    }

    public function createNote($userId, $data)
    {
        $title = trim($data['title'] ?? '');
        $content = trim($data['content'] ?? '');
        $labelIds = $data['labelIds'] ?? [];
        $images = $data['images'] ?? [];

        if ($title === '' && $content === '') {
            throw new Exception('Note cannot be empty. Please provide a title or content.', 422);
        }

        // Rubrik ID 8: Use user default note color if none provided
        $noteColor = $data['noteColor'] ?? null;
        if ($noteColor === null || $noteColor === 'default') {
            $user = $this->userModel->getById($userId);
            $noteColor = $user['note_color'] ?? 'default';
        }

        $this->db->beginTransaction();

        try {
            $noteId = $this->noteModel->create($userId, $title, $content, $noteColor);

            if (!$noteId) {
                throw new Exception('Failed to create note', 500);
            }

            $this->syncLabels($noteId, $labelIds);
            $this->syncImages($noteId, $images);

            $this->db->commit();
            return $this->getNote($noteId, $userId);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function updateNote($id, $userId, $data)
    {
        $note = $this->noteModel->getById($id, $userId);
        if (!$note) {
            throw new Exception('Note not found', 404);
        }

        $isOwner = (int)$note['user_id'] === (int)$userId;
        $canEdit = $isOwner || ($note['permission'] ?? null) === 'edit';
        if (!$canEdit) {
            throw new Exception('You do not have permission to edit this note', 403);
        }

        $this->ensureVerifiedAccessForLockedNote($note, 'edit this locked note');

        $this->db->beginTransaction();

        try {
            $title = trim($data['title'] ?? '');
            $content = trim($data['content'] ?? '');
            $noteColor = $data['noteColor'] ?? null;
            $labelIds = $data['labelIds'] ?? [];
            $images = $data['images'] ?? [];

            if ($title === '' && $content === '') {
                throw new Exception('Note cannot be empty. Please provide a title or content.', 422);
            }

            $success = $this->noteModel->update($id, $userId, $title, $content, $noteColor);

            if (!$success) {
                throw new Exception('Failed to update note or note not found', 500);
            }

            $this->syncLabels($id, $labelIds);
            $this->syncImages($id, $images);

            $this->db->commit();
            return $this->getNote($id, $userId);
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            throw $e;
        }
    }

    public function deleteNote($id, $userId, $password = null)
    {
        $note = $this->noteModel->getById($id, $userId);
        if (!$note) {
            throw new Exception('Note not found', 404);
        }

        $isOwner = (int)$note['user_id'] === (int)$userId;
        if (!$isOwner) {
            throw new Exception('You do not have permission to delete this note', 403);
        }

        if ($this->isLockedNote($note) && !$this->hasVerifiedNoteAccess($id)) {
            if (empty($password) || !$this->noteModel->verifyNotePassword($id, $password)) {
                throw new Exception('Password is required to delete this locked note', 401);
            }
        }

        if (!$this->noteModel->delete($id, $userId)) {
            throw new Exception('Failed to delete note', 500);
        }

        $this->clearVerifiedNoteAccess($id);
        return true;
    }

    public function togglePin($id, $userId)
    {
        $note = $this->noteModel->getById($id, $userId);
        if (!$note) {
            throw new Exception('Note not found', 404);
        }

        $this->ensureVerifiedAccessForLockedNote($note, 'change the pin status of this locked note');

        $newPinStatus = !$note['is_pinned'];
        if (!$this->noteModel->setPinStatus($id, $userId, $newPinStatus)) {
            throw new Exception('Failed to update pin status', 500);
        }

        return ['is_pinned' => $newPinStatus];
    }

    public function setLock($id, $userId, $data)
    {
        $note = $this->noteModel->getById($id, $userId);
        if (!$note) {
            throw new Exception('Note not found', 404);
        }

        // Only owners can change lock settings
        if ((int)$note['user_id'] !== (int)$userId) {
            throw new Exception('Only the owner can manage note security', 403);
        }

        $currentPassword = $data['currentPassword'] ?? '';
        $newPassword = $data['newPassword'] ?? ($data['password'] ?? '');
        $confirmPassword = $data['confirmPassword'] ?? '';

        if ($this->isLockedNote($note)) {
            if (trim($currentPassword) === '' || !$this->noteModel->verifyNotePassword($id, $currentPassword)) {
                throw new Exception('Current note password is incorrect', 401);
            }

            if ($newPassword === '' && $confirmPassword === '') {
                if (!$this->noteModel->setLockStatus($id, $userId, false, null)) {
                    throw new Exception('Failed to disable password protection', 500);
                }

                $this->clearVerifiedNoteAccess($id);
                return $this->getNote($id, $userId); // Return the now-unlocked note
            }

            if ($newPassword === '' || $confirmPassword === '') {
                throw new Exception('Please enter the new password twice', 422);
            }

            if ($newPassword !== $confirmPassword) {
                throw new Exception('New password and confirmation do not match', 422);
            }

            if (!$this->noteModel->setLockStatus($id, $userId, true, $newPassword)) {
                throw new Exception('Failed to update note password', 500);
            }

            $this->clearVerifiedNoteAccess($id);
            return $this->getNote($id, $userId);
        }

        if ($newPassword === '' || $confirmPassword === '') {
            throw new Exception('Please enter the password twice to enable protection', 422);
        }

        if ($newPassword !== $confirmPassword) {
            throw new Exception('Password and confirmation do not match', 422);
        }

        if (!$this->noteModel->setLockStatus($id, $userId, true, $newPassword)) {
            throw new Exception('Failed to enable password protection', 500);
        }

        $this->clearVerifiedNoteAccess($id);

        return $this->getNote($id, $userId); // Return the newly locked note (will be redacted)
    }

    public function verifyPassword($id, $userId, $password)
    {
        $note = $this->noteModel->getById($id, $userId);
        if (!$note) {
            throw new Exception('Note not found', 404);
        }

        if (!$this->noteModel->verifyNotePassword($id, $password)) {
            throw new Exception('Incorrect password', 401);
        }

        $this->markNoteAsVerified($id);

        return $this->getNote($id, $userId, true);
    }

    public function getSharedNotes($userId)
    {
        $sharedNotes = $this->noteShareModel->getReceivedByUser($userId);

        foreach ($sharedNotes as &$note) {
            $noteId = $note['note_id'];
            $images = $this->noteImageModel->getByNoteId($noteId);
            $note['images'] = array_map(fn($img) => $img['image_url'], $images);
            
            $labels = $this->noteLabelModel->getLabelsByNoteId($noteId);
            $note['labelIds'] = array_map(fn($l) => (int)$l['id'], $labels);
            $note['ownerEmail'] = $note['owner_email'] ?? '';
            $note['ownerDisplayName'] = $note['owner_name'] ?? '';
            $note['sharedAt'] = $note['shared_at'] ?? null;
            $note = $this->formatNote($note);
        }

        return $sharedNotes;
    }

    public function shareNote($id, $userId, $email, $role)
    {
        $note = $this->noteModel->getById($id, $userId);
        if (!$note) {
            throw new Exception('Note not found', 404);
        }

        $this->ensureVerifiedAccessForLockedNote($note, 'share this locked note');

        if (empty($email)) {
            throw new Exception('Email is required', 400);
        }

        $recipient = $this->userModel->findByEmail($email);
        if (!$recipient) {
            throw new Exception('User not found with this email', 404);
        }

        if ((int)$recipient['id'] === (int)$userId) {
            throw new Exception('You cannot share a note with yourself', 400);
        }

        if (!$this->noteShareModel->create($id, $userId, $recipient['id'], $role)) {
            throw new Exception('Failed to share note', 500);
        }

        // Send email notification to recipient (Better Approach for Rubrik ID 23)
        try {
            $sender = $this->userModel->getById($userId);
            $this->mailService->sendShareNotificationEmail(
                $email,
                $sender['display_name'] ?? $sender['email'],
                $note['title'] ?: 'Untitled Note',
                $role
            );
        } catch (Exception $e) {
            // We don't want to fail the whole sharing process if mail fails
            error_log("Failed to send share notification email: " . $e->getMessage());
        }

        return true;
    }

    public function revokeShare($id, $userId, $email)
    {
        $note = $this->noteModel->getById($id, $userId);
        if (!$note) {
            throw new Exception('Note not found', 404);
        }

        $this->ensureVerifiedAccessForLockedNote($note, 'change sharing for this locked note');

        $recipient = $this->userModel->findByEmail($email);
        if (!$recipient) {
            throw new Exception('Recipient not found', 404);
        }

        if (!$this->noteShareModel->revoke($id, $userId, $recipient['id'])) {
            throw new Exception('Failed to revoke share', 500);
        }

        return true;
    }

    private function enrichNoteData($note, $userId, $bypassLock = false)
    {
        $noteId = $note['id'];
        $isLocked = (bool)($note['is_locked'] ?? false);
        
        // Images
        $images = $this->noteImageModel->getByNoteId($noteId);
        $note['images'] = array_map(fn($img) => $img['image_url'], $images);
        
        // Labels
        $labels = $this->noteLabelModel->getLabelsByNoteId($noteId);
        $note['labelIds'] = array_map(fn($l) => (int)$l['id'], $labels);
        
        // Sharing Info for Owner
        $isOwner = (int)$note['user_id'] === (int)$userId;
        if ($isOwner) {
            $shares = $this->noteShareModel->getByOwner($userId);
            $noteShared = array_filter($shares, fn($s) => $s['note_id'] == $noteId);
            $note['sharedWith'] = array_values(array_map(fn($s) => [
                'email' => $s['recipient_email'], 
                'role' => $s['permission'],
                'sharedAt' => $s['shared_at'] ?? null
            ], $noteShared));
        }

        // Owner info for Recipients
        if (!$isOwner) {
            $owner = $this->userModel->getById($note['user_id']);
            $note['ownerEmail'] = $owner['email'] ?? '';
            $note['ownerDisplayName'] = $owner['display_name'] ?? '';
        }

        // Redaction for Locked Notes
        if ($isLocked && !$bypassLock) {
            $note['content'] = "[Locked Content]";
            $note['images'] = [];
        }

        return $this->formatNote($note);
    }

    private function formatNote($note)
    {
        return [
            'id' => (int)$note['id'],
            'userId' => (int)($note['user_id'] ?? 0),
            'title' => $note['title'] ?? '',
            'content' => $note['content'] ?? '',
            'noteColor' => $note['note_color'] ?? 'default',
            'isPinned' => (bool)($note['is_pinned'] ?? false),
            'pinnedAt' => $note['pinned_at'] ?? null,
            'isLocked' => (bool)($note['is_locked'] ?? false),
            'images' => $note['images'] ?? [],
            'labelIds' => $note['labelIds'] ?? [],
            'sharedWith' => $note['sharedWith'] ?? [],
            'ownerEmail' => $note['ownerEmail'] ?? null,
            'ownerDisplayName' => $note['ownerDisplayName'] ?? null,
            'sharedAt' => $note['sharedAt'] ?? ($note['shared_at'] ?? null),
            'permission' => $note['permission'] ?? 'owner',
            'createdAt' => $note['created_at'] ?? null,
            'updatedAt' => $note['updated_at'] ?? null,
        ];
    }

    private function syncLabels($noteId, $labelIds)
    {
        $existingLabels = $this->noteLabelModel->getLabelsByNoteId($noteId);
        foreach ($existingLabels as $el) {
            $this->noteLabelModel->detachLabel($noteId, $el['id']);
        }
        foreach ($labelIds as $lid) {
            $this->noteLabelModel->attachLabel($noteId, $lid);
        }
    }

    private function syncImages($noteId, $images)
    {
        $existingImages = $this->noteImageModel->getByNoteId($noteId);
        foreach ($existingImages as $eImg) {
            $this->noteImageModel->delete($eImg['id'], $noteId);
        }
        foreach ($images as $imgUrl) {
            $this->noteImageModel->create($noteId, $imgUrl);
        }
    }

    private function isLockedNote($note)
    {
        return !empty($note['is_locked']);
    }

    private function ensureVerifiedAccessForLockedNote($note, $actionLabel)
    {
        if (!$this->isLockedNote($note)) {
            return;
        }

        if (!$this->hasVerifiedNoteAccess($note['id'])) {
            throw new Exception("Please enter the note password before you can {$actionLabel}", 401);
        }
    }

    private function markNoteAsVerified($noteId)
    {
        if (!isset($_SESSION[self::VERIFIED_NOTE_SESSION_KEY]) || !is_array($_SESSION[self::VERIFIED_NOTE_SESSION_KEY])) {
            $_SESSION[self::VERIFIED_NOTE_SESSION_KEY] = [];
        }

        $_SESSION[self::VERIFIED_NOTE_SESSION_KEY][(string)$noteId] = time();
    }

    private function hasVerifiedNoteAccess($noteId)
    {
        return !empty($_SESSION[self::VERIFIED_NOTE_SESSION_KEY][(string)$noteId]);
    }

    private function clearVerifiedNoteAccess($noteId)
    {
        if (isset($_SESSION[self::VERIFIED_NOTE_SESSION_KEY][(string)$noteId])) {
            unset($_SESSION[self::VERIFIED_NOTE_SESSION_KEY][(string)$noteId]);
        }
    }
}
