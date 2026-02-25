[Unit]
Description=Bull Board (bb) - Dashboard + API + SSE
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory={{PREFIX}}
Environment=PREFIX={{PREFIX}}
Environment=PORT=6666
Environment=SQLITE_PATH={{PREFIX}}/data/db/bb.sqlite
Environment=DASHBOARD_DIST={{PREFIX}}/current/dashboard/dist
EnvironmentFile=-{{PREFIX}}/config/bb.env
ExecStart=/usr/local/bin/bb server --prefix {{PREFIX}}
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bb

[Install]
WantedBy=multi-user.target
