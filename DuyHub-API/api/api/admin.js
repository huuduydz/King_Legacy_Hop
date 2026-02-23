import { kv } from '@vercel/kv';

// ĐỔI MẬT KHẨU CỦA BẠN Ở ĐÂY
const ADMIN_PASSWORD = "PassCuaDuy123";

export default async function handler(req, res) {
  // =================================================================
  // 1. XỬ LÝ LỆNH TỪ GIAO DIỆN GỬI LÊN (METHOD: POST)
  // =================================================================
  if (req.method === 'POST') {
    const { pass, action, account } = req.body;

    // Kiểm tra mật khẩu
    if (pass !== ADMIN_PASSWORD) {
      return res.status(200).json({ success: false, msg: "❌ Sai mật khẩu Admin!" });
    }
    if (!account) {
      return res.status(200).json({ success: false, msg: "❌ Vui lòng nhập tên tài khoản khách!" });
    }

    try {
      if (action === "add") {
        const existing = await kv.get(`user_${account}`);
        if (existing) return res.status(200).json({ success: false, msg: `❌ Khách hàng ${account} đã tồn tại!` });

        await kv.set(`user_${account}`, { robloxName: null, active: true });
        return res.status(200).json({ success: true, msg: `✅ Đã tạo thành công khách hàng: ${account}` });
      }
      
      if (action === "del") {
        const existing = await kv.get(`user_${account}`);
        if (!existing) return res.status(200).json({ success: false, msg: `❌ Không tìm thấy khách hàng ${account}` });

        await kv.del(`user_${account}`);
        return res.status(200).json({ success: true, msg: `🗑️ Đã thu hồi & xóa bản quyền của: ${account}` });
      }
      
      if (action === "reset") {
        const existing = await kv.get(`user_${account}`);
        if (existing) {
          existing.robloxName = null; // Xóa tên ingame cũ
          await kv.set(`user_${account}`, existing);
          return res.status(200).json({ success: true, msg: `🔄 Đã mở khóa nick Roblox cho: ${account}` });
        }
        return res.status(200).json({ success: false, msg: `❌ Không tìm thấy khách hàng ${account}` });
      }
    } catch (error) {
      return res.status(200).json({ success: false, msg: "❌ Lỗi hệ thống cơ sở dữ liệu Vercel!" });
    }
  }

  // =================================================================
  // 2. GIAO DIỆN WEB DÀNH CHO ADMIN (METHOD: GET)
  // =================================================================
  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DuyHub - Admin Dashboard</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f0f11; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .container { background: #1a1a1f; padding: 30px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.8); width: 100%; max-width: 400px; border: 1px solid #333; }
            h2 { text-align: center; color: #00ff88; margin-top: 0; margin-bottom: 20px; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
            .input-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-size: 13px; color: #aaa; }
            input { width: 100%; padding: 12px; border-radius: 6px; border: 1px solid #333; background: #0f0f11; color: white; font-size: 15px; outline: none; box-sizing: border-box; transition: 0.3s; }
            input:focus { border-color: #00ff88; box-shadow: 0 0 8px rgba(0, 255, 136, 0.2); }
            button { width: 100%; padding: 12px; margin-top: 10px; border-radius: 6px; border: none; font-size: 14px; font-weight: bold; cursor: pointer; transition: 0.3s; box-sizing: border-box; }
            button:active { transform: scale(0.98); }
            .btn-add { background: rgba(0, 255, 136, 0.1); color: #00ff88; border: 1px solid #00ff88; }
            .btn-add:hover { background: #00ff88; color: black; }
            .btn-reset { background: rgba(243, 156, 18, 0.1); color: #f39c12; border: 1px solid #f39c12; }
            .btn-reset:hover { background: #f39c12; color: black; }
            .btn-del { background: rgba(255, 71, 87, 0.1); color: #ff4757; border: 1px solid #ff4757; }
            .btn-del:hover { background: #ff4757; color: white; }
            .result-box { margin-top: 20px; padding: 12px; border-radius: 6px; background: #0f0f11; border: 1px dashed #333; text-align: center; font-size: 14px; min-height: 20px; }
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
                <label>Tên tài khoản khách hàng:</label>
                <input type="text" id="username" placeholder="Ví dụ: khiem123">
            </div>

            <button class="btn-add" onclick="executeAction('add')">➕ CẤP QUYỀN KHÁCH MỚI</button>
            <button class="btn-reset" onclick="executeAction('reset')">🔄 MỞ KHÓA NICK ROBLOX</button>
            <button class="btn-del" onclick="executeAction('del')">🗑️ THU HỒI BẢN QUYỀN</button>

            <div id="output" class="result-box" style="color: #888;">Hệ thống đang chờ lệnh...</div>
        </div>

        <script>
            async function executeAction(actionType) {
                const pass = document.getElementById('adminPass').value;
                const account = document.getElementById('username').value;
                const output = document.getElementById('output');

                if (!pass || !account) {
                    output.innerHTML = "<span style='color: #ff4757;'>❌ Vui lòng điền đủ mật khẩu và tên khách!</span>";
                    return;
                }

                output.innerHTML = "⏳ Đang kết nối tới máy chủ Vercel...";

                try {
                    const res = await fetch('/api/admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pass, action: actionType, account })
                    });
                    
                    const data = await res.json();

                    if (data.success) {
                        output.innerHTML = "<span style='color: #00ff88; font-weight: bold;'>" + data.msg + "</span>";
                    } else {
                        output.innerHTML = "<span style='color: #ff4757;'>" + data.msg + "</span>";
                    }
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