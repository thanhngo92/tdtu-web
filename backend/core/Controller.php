<?php

class Controller
{
    protected PDO $conn;

    public function __construct(PDO $conn)
    {
        $this->conn = $conn;
    }

    protected function success(Response $response, $data = [], int $status = 200)
    {
        return $response->success($data, $status);
    }

    protected function error(Response $response, string $message = 'Error', int $status = 400, $errors = null)
    {
        return $response->error($message, $status, $errors);
    }
}