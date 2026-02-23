import { MongoClient } from 'mongodb';

// ĐỔI MẬT KHẨU ADMIN CỦA BẠN Ở ĐÂY
const ADMIN_PASSWORD = "3399216308";

let cachedClient = null;
async function connectDB() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  // =================================================================
  // 1. XỬ LÝ LỆNH LƯU/XÓA TỪ DATABASE MONGODB
  // =================================================================
  if (req.method === 'POST') {
    const { pass, action, account, robloxList } = req.body;

    if (pass !== ADMIN_PASSWORD) return res.status(200).json({ success: false, msg: "❌ Sai mật khẩu Admin!" });
    if (!account || account.trim() === "") return res.status(200).json({ success: false, msg: "❌ Vui lòng nhập Tên User của khách hàng!" });

    try {
      const client = await connectDB();
      const db = client.db('DuyHubDB');
      const users = db.collection('Users');
      
      const targetUser = account.trim();

      // LỆNH LƯU HOẶC CẬP NHẬT (UPSERT)
      if (action === "save") {
        let nicks = [];
        if (robloxList && robloxList.trim() !== "") {
            // Cắt danh sách nick từ dấu phẩy hoặc dòng mới
            nicks = robloxList.split(/[\n,]+/).map(a => a.trim()).filter(a => a !== "");
        }
        
        // Cập nhật vào DB: Nếu User có rồi thì đè danh sách nick mới lên, chưa có thì tạo mới
        await users.updateOne(
            { account: targetUser },
            { $set: { account: targetUser, robloxNames: nicks, active: true } },
            { upsert: true }
        );
        return res.status(200).json({ success: true, msg: `✅ Đã lưu User: <b>${targetUser}</b>.<br>🎮 Gồm ${nicks.length} nick Roblox: <span style="color:#00ff88;">${nicks.join(", ")}</span>` });
      } 
      // LỆNH XÓA HOÀN TOÀN
      else if (action === "del") {
        const result = await users.deleteOne({ account: targetUser });
        if (result.deletedCount > 0) {
            return res.status(200).json({ success: true, msg: `🗑️ Đã thu hồi & Xóa hoàn toàn User: <b>${targetUser}</b>` });
        } else {
            return res.status(200).json({ success: false, msg: `❌ Không tìm thấy User: <b>${targetUser}</b>` });
        }
      }
    } catch (error) {
      return res.status(200).json({ success: false, msg: "❌ Lỗi kết nối MongoDB! Vui lòng kiểm tra lại biến MONGODB_URI." });
    }
  }

  // =================================================================
  // 2. GIAO DIỆN WEB DÀNH CHO ADMIN
  // =================================================================
  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DuyHub - Quản Lý Khách Hàng</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f0f11; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .container { background: #1a1a1f; padding: 30px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.8); width: 100%; max-width: 450px; border: 1px solid #333; }
            h2 { text-align: center; color: #00ff88; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
            .input-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-size: 13px; color: #aaa; font-weight: bold; }
            input, textarea { width: 100%; padding: 12px; border-radius: 6px; border: 1px solid #333; background: #0f0f11; color: white; font-size: 15px; outline: none; box-sizing: border-box; transition: 0.3s; font-family: inherit; }
            input:focus, textarea:focus { border-color: #00ff88; box-shadow: 0 0 8px rgba(0, 255, 136, 0.2); }
            textarea { resize: vertical; min-height: 100px; }
            button { width: 100%; padding: 12px; margin-top: 10px; border-radius: 6px; border: none; font-size: 14px; font-weight: bold; cursor: pointer; transition: 0.3s; box-sizing: border-box; }
            button:active { transform: scale(0.98); }
            .btn-save { background: rgba(0, 255, 136, 0.1); color: #00ff88; border: 1px solid #00ff88; }
            .btn-save:hover { background: #00ff88; color: black; }
            .btn-del { background: rgba(255, 71, 87, 0.1); color: #ff4757; border: 1px solid #ff4757; }
            .btn-del:hover { background: #ff4757; color: white; }
            .result-box { margin-top: 20px; padding: 15px; border-radius: 6px; background: #0f0f11; border: 1px dashed #333; text-align: center; font-size: 14px; min-height: 20px; line-height: 1.6; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>👑 DuyHub Panel</h2>
            
            <div class="input-group">
                <label>Mật khẩu Admin:</label>
                <input type="password" id="adminPass" placeholder="Nhập mật khẩu bí mật...">
            </div>

            <div class="input-group">
                <label>Tên User Khách hàng (VD: khiem):</label>
                <input type="text" id="username" placeholder="Nhập 1 tên User duy nhất...">
            </div>

            <div class="input-group">
                <label>Danh sách Nick Roblox hợp lệ:</label>
                <textarea id="robloxList" placeholder="khiem1\nkhiem2\nkhiem3\n(Cách nhau bằng phẩy hoặc xuống dòng)"></textarea>
            </div>

            <button class="btn-save" onclick="executeAction('save')">💾 LƯU / CẬP NHẬT TÀI KHOẢN</button>
            <button class="btn-del" onclick="executeAction('del')">🗑️ XÓA HOÀN TOÀN KHÁCH HÀNG</button>

            <div id="output" class="result-box" style="color: #888;">Hệ thống đang chờ lệnh...</div>
        </div>

        <script>
            async function executeAction(actionType) {
                const pass = document.getElementById('adminPass').value;
                const account = document.getElementById('username').value;
                const robloxList = document.getElementById('robloxList').value;
                const output = document.getElementById('output');

                if (!pass || !account) {
                    output.innerHTML = "<span style='color: #ff4757;'>❌ Vui lòng điền đủ mật khẩu và Tên User!</span>";
                    return;
                }

                output.innerHTML = "⏳ Đang kết nối tới máy chủ MongoDB...";

                try {
                    const res = await fetch('/api/admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pass, action: actionType, account, robloxList })
                    });
                    
                    const data = await res.json();

                    if (data.success) {
                        output.innerHTML = "<span style='color: #00ff88;'>" + data.msg + "</span>";
                    } else {
                        output.innerHTML = "<span style='color: #ff4757;'>" + data.msg + "</span>";
                    }
                } catch (err) {
                    output.innerHTML = "<span style='color: #ff4757;'>❌ Lỗi mạng! Không thể kết nối.</span>";
                }
            }
        </script>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}