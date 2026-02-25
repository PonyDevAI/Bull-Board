[Unit]
Description=Bull Board Runner (Go)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory={{PREFIX}}/current/worker
EnvironmentFile={{PREFIX}}/shared/config/.env
ExecStart={{PREFIX}}/current/worker/runner
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bullboard-runner

[Install]
WantedBy=multi-user.target
