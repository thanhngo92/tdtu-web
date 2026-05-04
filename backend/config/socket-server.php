<?php

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use App\Services\NoteSocket;

require dirname(__DIR__) . '/vendor/autoload.php';

$port = 8080;

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new NoteSocket()
        )
    ),
    $port
);

echo "WebSocket server running on port {$port}...\n";

$server->run();
