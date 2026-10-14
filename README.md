# paseo-plugin-plantuml

Plugin [Paseo](https://paseo.sh) hiển thị sơ đồ PlantUML (Sequence, Class, Activity, ERD, C4...) trực quan.

- **Timeline chat:** tin nhắn của agent chứa khối ` ```plantuml ` / ` ```puml ` / ` ```uml ` hoặc `@startuml ... @enduml` được render thành sơ đồ.
- **Panel "PlantUML Preview":** xem sơ đồ từ file `.md` / `.puml` trong workspace. Mở qua Command Center (`PlantUML: Open Diagram & Markdown Preview`) hoặc slash command `/plantuml`.
- **Settings → Plugins → PlantUML Preview:** đổi server render, định dạng mặc định (SVG/PNG), chế độ xem mặc định.

## Cài đặt

Yêu cầu Paseo `>= 0.10.3`.

```bash
paseo plugin install github:luongndcoder/paseo-plugin-plantuml --ref main
```

Cài lên daemon ở máy khác: thêm `--host <host:port>`.

Cập nhật: `paseo plugin ls` để xem commit đang cài, cập nhật theo hướng dẫn của Paseo cho Git source.

## Quyền riêng tư

Mặc định sơ đồ được render bởi server công cộng `https://www.plantuml.com/plantuml`: **toàn bộ source sơ đồ được gửi lên server đó**. Với tài liệu nội bộ, chạy server PlantUML riêng và đổi `serverUrl` trong Settings, ví dụ:

```bash
brew install plantuml
plantuml -picoweb:8080     # serverUrl: http://localhost:8080/plantuml
# hoặc
docker run -d -p 8080:8080 plantuml/plantuml-server:jetty   # serverUrl: http://localhost:8080
```

## Phát triển

```bash
npm install
npm run typecheck
paseo plugin install ./     # cài từ thư mục local
```
