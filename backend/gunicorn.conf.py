[gunicorn]
bind = "0.0.0.0:$PORT"
workers = 2
worker_class = sync
worker_connections = 1000
timeout = 30
keepalive = 2
max_requests = 1000
max_requests_jitter = 50