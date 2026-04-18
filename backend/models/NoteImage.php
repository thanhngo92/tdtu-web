<?php

require_once __DIR__ . '/../core/Database.php';

class NoteImage
{
    private PDO $conn;
    private string $table = 'note_images';

    public function __construct(?PDO $conn = null)
    {
        if ($conn instanceof PDO) {
            $this->conn = $conn;
            return;
        }

        $database = new Database();
        $this->conn = $database->connect();
    }

    public function createTable()
    {
        $sql = "CREATE TABLE IF NOT EXISTS {$this->table} (
            id INT AUTO_INCREMENT PRIMARY KEY,
            note_id INT NOT NULL,
            image_url VARCHAR(500) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
        )";

        return $this->conn->exec($sql);
    }

    public function create($noteId, $imageUrl)
    {
        $sql = "INSERT INTO {$this->table} (note_id, image_url)
                VALUES (:note_id, :image_url)";

        $stmt = $this->conn->prepare($sql);

        return $stmt->execute([
            ':note_id' => $noteId,
            ':image_url' => $imageUrl
        ]);
    }

    public function getByNoteId($noteId)
    {
        $sql = "SELECT *
                FROM {$this->table}
                WHERE note_id = :note_id
                ORDER BY id DESC";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute([
            ':note_id' => $noteId
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function delete($id, $noteId)
    {
        $sql = "DELETE FROM {$this->table}
                WHERE id = :id AND note_id = :note_id";

        $stmt = $this->conn->prepare($sql);

        return $stmt->execute([
            ':id' => $id,
            ':note_id' => $noteId
        ]);
    }
}