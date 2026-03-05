[Unit]
Description=Bull Board Person (Go)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory={{PREFIX}}/current/worker
EnvironmentFile={{PREFIX}}/shared/config/.env
ExecStart={{PREFIX}}/current/worker/bb-person
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bullboard-person

[Install]
WantedBy=multi-user.target
