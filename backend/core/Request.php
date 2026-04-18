<?php

class Request {
    public $method;
    public $uri;
    public $body;
    public $query;

    public function __construct() {
        $this->method = $_SERVER['REQUEST_METHOD'];
        $this->uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        // body JSON
        $this->body = json_decode(file_get_contents("php://input"), true);

        // query string (?page=1)
        $this->query = $_GET;
    }

    public function body()
    {
        return $this->body ?? [];
    }

    public function getBody()
    {
        return $this->body();
    }

    public function query()
    {
        return $this->query ?? [];
    }

    public function getParam($index)
    {
        return $this->params[$index] ?? null;
    }
}