import { MongoClient } from 'mongodb';

const ADMIN_PASSWORD = "3399216308"; // Đổi pass đăng nhập web của bạn ở đây

let cachedClient = null;
async function connectDB() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { pass, action, account } = req.body;

    if (pass !== ADMIN_PASSWORD) return res.status(200).json({ success: false, msg: "❌ Sai mật khẩu Admin!" });
    if (!account || account.trim() === "") return res.status(200).json({ success: false, msg: "❌ Vui lòng nhập tên!" });

    try {
      const client = await connectDB();
      const db = client.db('DuyHubDB'); // Tên cơ sở dữ liệu
      const users = db.collection('Users'); // Tên bảng lưu khách hàng

      const accountList = account.split(/[\n,]+/).map(a => a.trim()).filter(a => a !== "");
      let added = [], existed = [], deleted = [], reset = [];

      for (const acc of accountList) {
        if (action === "add") {
          const existing = await users.findOne({ account: acc });
          if (existing) {
            existed.push(acc);
          } else {
            await users.insertOne({ account: acc, robloxName: null, active: true });
            added.push(acc);
          }
        } 
        else if (action === "del") {
          await users.deleteOne({ account: acc });
          deleted.push(acc);
        } 
        else if (action === "reset") {
          const existing = await users.findOne({ account: acc });
          if (existing) {
            await users.updateOne({ account: acc }, { $set: { robloxName: null } });
            reset.push(acc);
          }
        }
      }

      let resultMsg = "";
      if (action === "add") {
        if (added.length > 0) resultMsg += `✅ Đã cấp quyền: <b>${added.join(", ")}</b><br>`;
        if (existed.length > 0) resultMsg += `⚠️ Đã tồn tại: <span style="color:#aaa;">${existed.join(", ")}</span>`;
      } else if (action === "del") {
        resultMsg += `🗑️ Đã xóa: <b>${deleted.join(", ")}</b>`;
      } else if (action === "reset") {
        resultMsg += `🔄 Đã mở khóa Nick cho: <b>${reset.join(", ")}</b>`;
      }

      return res.status(200).json({ success: true, msg: resultMsg });

    } catch (error) {
      return res.status(200).json({ success: false, msg: "❌ Lỗi kết nối MongoDB!" });
    }
  }

  // GIAO DIỆN WEB (Giữ nguyên cấu trúc HTML xịn xò)
  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DuyHub - Admin Dashboard</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f0f11; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .container { background: #1a1a1f; padding: 30px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.8); width: 100%; max-width: 450px; border: 1px solid #333; }
            h2 { text-align: center; color: #00ff88; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
            .input-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-size: 13px; color: #aaa; }
            input, textarea { width: 100%; padding: 12px; border-radius: 6px; border: 1px solid #333; background: #0f0f11; color: white; font-size: 14px; outline: none; box-sizing: border-box; transition: 0.3s; font-family: inherit; }
            input:focus, textarea:focus { border-color: #00ff88; box-shadow: 0 0 8px rgba(0, 255, 136, 0.2); }
            textarea { resize: vertical; min-height: 80px; }
            button { width: 100%; padding: 12px; margin-top: 10px; border-radius: 6px; border: none; font-size: 14px; font-weight: bold; cursor: pointer; transition: 0.3s; box-sizing: border-box; }
            button:active { transform: scale(0.98); }
            .btn-add { background: rgba(0, 255, 136, 0.1); color: #00ff88; border: 1px solid #00ff88; }
            .btn-add:hover { background: #00ff88; color: black; }
            .btn-reset { background: rgba(243, 156, 18, 0.1); color: #f39c12; border: 1px solid #f39c12; }
            .btn-reset:hover { background: #f39c12; color: black; }
            .btn-del { background: rgba(255, 71, 87, 0.1); color: #ff4757; border: 1px solid #ff4757; }
            .btn-del:hover { background: #ff4757; color: white; }
            .result-box { margin-top: 20px; padding: 12px; border-radius: 6px; background: #0f0f11; border: 1px dashed #333; text-align: center; font-size: 14px; min-height: 20px; line-height: 1.5; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>👑 DuyHub Panel</h2>
            <div class="input-group">
                <label>Mật khẩu Quản trị viên:</label>
                <input type="password" id="adminPass" placeholder="••••••••••••">
            </div>
            <div class="input-group">
                <label>Danh sách tài khoản (Cách nhau bằng dấu phẩy hoặc xuống dòng):</label>
                <textarea id="username" placeholder="khiem1\nkhiem2\ntuan123"></textarea>
            </div>
            <button class="btn-add" onclick="executeAction('add')">➕ CẤP QUYỀN HÀNG LOẠT</button>
            <button class="btn-reset" onclick="executeAction('reset')">🔄 MỞ KHÓA NICK HÀNG LOẠT</button>
            <button class="btn-del" onclick="executeAction('del')">🗑️ THU HỒI HÀNG LOẠT</button>
            <div id="output" class="result-box" style="color: #888;">Hệ thống đang chờ lệnh...</div>
        </div>
        <script>
            async function executeAction(actionType) {
                const pass = document.getElementById('adminPass').value;
                const account = document.getElementById('username').value;
                const output = document.getElementById('output');
                if (!pass || !account) {
                    output.innerHTML = "<span style='color: #ff4757;'>❌ Vui lòng điền đủ thông tin!</span>"; return;
                }
                output.innerHTML = "⏳ Đang kết nối tới máy chủ MongoDB...";
                try {
                    const res = await fetch('/api/admin', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pass, action: actionType, account })
                    });
                    const data = await res.json();
                    if (data.success) output.innerHTML = "<span style='color: #00ff88;'>" + data.msg + "</span>";
                    else output.innerHTML = "<span style='color: #ff4757;'>" + data.msg + "</span>";
                } catch (err) {
                    output.innerHTML = "<span style='color: #ff4757;'>❌ Lỗi kết nối mạng!</span>";
                }
            }
        </script>
    </body>
    </html>
  `;
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}