# Kết thúc phiên

Khi người dùng nhắn **"kết thúc phiên"** (hoặc các biến thể: "kết thúc", "hết phiên", "end session", "done", "xong"):

1. Tự động phân tích các thay đổi chưa commit trong workspace (`git status` + `git diff --staged` + `git diff`).
2. Viết **một commit message** theo format Conventional Commits, gồm:
   - **type** phù hợp (`feat`, `fix`, `refactor`, `style`, `docs`, `chore`, `perf`, `test`)
   - **scope** (vd: `student`, `frontend`, `api`) nếu rõ ràng
   - **subject** ngắn gọn (< 72 ký tự), tiếng Việt hoặc tiếng Anh tùy theo ngôn ngữ chính của thay đổi
   - **body** (nếu cần) liệt kê các thay đổi chính dưới dạng bullet
3. In commit message vào chat dưới dạng code block.
4. **Không** chạy `git commit`, **không** push — chỉ gợi ý để người dùng tự commit.

## Lưu ý

- **Không** chủ động nhắc commit message khi người dùng chưa nói "kết thúc phiên" — tránh làm phiền.
- Nếu không có thay đổi nào chưa commit, báo rõ "Không có thay đổi nào để commit".
- Nếu có nhiều thay đổi không liên quan, gợi ý chia thành nhiều commit riêng.
