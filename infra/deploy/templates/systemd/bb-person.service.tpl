[Unit]
Description=Bull Board Person (bb-person)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory={{PREFIX}}
Environment=PREFIX={{PREFIX}}
Environment=API_BASE_URL=http://127.0.0.1:8888
Environment=SQLITE_PATH={{PREFIX}}/data/db/bb.sqlite
Environment=ARTIFACTS_DIR={{PREFIX}}/data/artifacts
EnvironmentFile=-{{PREFIX}}/config/bb.env
ExecStart=/usr/local/bin/bb-person
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bb-person

[Install]
WantedBy=multi-user.target
