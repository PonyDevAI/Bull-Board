# Bull Board - nginx reverse proxy（dashboard 反代 control）
# SSE 必须关闭 proxy_buffering，否则事件会延迟或丢失
# 将 {{CONTROL_UPSTREAM}} 替换为 control 服务地址，如 127.0.0.1:3000

upstream control_backend {
    server {{CONTROL_UPSTREAM}};
}

server {
    listen 80;
    server_name _;
    root {{WEB_ROOT}};
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://control_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/events {
        proxy_pass http://control_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Cache-Control no-cache;
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }
}
