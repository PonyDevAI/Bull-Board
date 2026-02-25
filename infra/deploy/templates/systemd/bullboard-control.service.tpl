[Unit]
Description=Bull Board Control Plane (Fastify API + SQLite + SSE)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory={{PREFIX}}/current/control
EnvironmentFile={{PREFIX}}/shared/config/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bullboard-control

[Install]
WantedBy=multi-user.target
