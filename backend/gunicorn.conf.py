# Gunicorn configuration file
import os

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '5001')}"
backlog = 2048

# Worker processes
workers = 2
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Restart workers after this many requests, with a jitter
max_requests = 1000
max_requests_jitter = 50

# Logging
loglevel = "info"
accesslog = "-"
errorlog = "-"