<?php

class Controller
{
    protected PDO $conn;

    public function __construct(PDO $conn)
    {
        $this->conn = $conn;
    }

    protected function success(Response $response, $data = [], $status = 200)
    {
        return $response->success($data, (int)$status);
    }

    protected function error(Response $response, string $message = 'Error', $status = 400, $errors = null)
    {
        return $response->error($message, (int)$status, $errors);
    }
}