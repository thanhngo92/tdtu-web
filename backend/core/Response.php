<?php

class Response
{
    public function json($data, int $status = 200)
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
        return null;
    }

    public function success($data = [], int $status = 200)
    {
        return $this->json([
            'success' => true,
            'data' => $data
        ], $status);
    }

    public function error(string $message = 'Error', int $status = 400, $errors = null)
    {
        $payload = [
            'success' => false,
            'message' => $message
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return $this->json($payload, $status);
    }
}