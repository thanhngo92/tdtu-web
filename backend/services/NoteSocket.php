<?php

namespace App\Services;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class NoteSocket implements MessageComponentInterface
{
    protected $clients;
    protected $rooms;

    public function __construct()
    {
        $this->clients = new \SplObjectStorage;
        $this->rooms = []; // noteId => [ConnectionInterface, ...]
        echo "NoteSocket Server Started!\n";
    }

    public function onOpen(ConnectionInterface $conn)
    {
        $this->clients->attach($conn);
        echo "New connection! ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg)
    {
        $data = json_decode($msg, true);
        if (!$data || !isset($data['action'])) {
            return;
        }

        switch ($data['action']) {
            case 'join':
                $noteId = $data['noteId'] ?? null;
                if ($noteId) {
                    $this->joinRoom($from, $noteId);
                }
                break;

            case 'note-updated':
            case 'note-deleted':
            case 'note-pinned':
                $noteId = $data['noteId'] ?? null;
                if ($noteId) {
                    $this->broadcastToRoom($from, $noteId, $msg);
                }
                break;
        }
    }

    public function onClose(ConnectionInterface $conn)
    {
        $this->clients->detach($conn);
        $this->leaveAllRooms($conn);
        echo "Connection {$conn->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e)
    {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }

    protected function joinRoom(ConnectionInterface $conn, $noteId)
    {
        $this->leaveAllRooms($conn);

        if (!isset($this->rooms[$noteId])) {
            $this->rooms[$noteId] = [];
        }

        $this->rooms[$noteId][$conn->resourceId] = $conn;
        echo "Connection {$conn->resourceId} joined room: note_{$noteId}\n";
    }

    protected function leaveAllRooms(ConnectionInterface $conn)
    {
        foreach ($this->rooms as $noteId => &$clients) {
            if (isset($clients[$conn->resourceId])) {
                unset($clients[$conn->resourceId]);
                echo "Connection {$conn->resourceId} left room: note_{$noteId}\n";
            }
        }
    }

    protected function broadcastToRoom(ConnectionInterface $from, $noteId, $msg)
    {
        if (!isset($this->rooms[$noteId])) {
            return;
        }

        foreach ($this->rooms[$noteId] as $client) {
            if ($from !== $client) {
                $client->send($msg);
            }
        }
    }
}
