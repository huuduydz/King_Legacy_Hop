import { kv } from '@vercel/kv';

const ADMIN_PASSWORD = "PassCuaDuy123"; // Đổi pass ở đây

export default async function handler(req, res) {
  // 1. XỬ LÝ LỆNH TỪ NÚT BẤM (POST REQUEST)
  if (req.method === 'POST') {
    const { pass, action, account } = req.body;

    if (pass !== ADMIN_PASSWORD) {
      return res.status(200).json({ success: false, msg: "❌ Sai mật khẩu Admin!" });
    }
    if (!account) {
      return res.status(200).json({ success: false, msg: "❌ Vui lòng nhập tên khách!" });
    }

    try {
      if (action === "add") {
        const existing = await kv.get(`user_${account}`);
        if (existing) return res.status(200).json({ success: false, msg: `❌ Khách ${account} đã tồn tại!` });

        await kv.set(`user_${account}`, { robloxName: null, active: true });
        return res.status(200).json({ success: true, msg: `✅ Đã tạo quyền cho: ${account}` });
      }
      
      if (action === "del") {
        await kv.del(`user_${account}`);
        return res.status(200).json({ success: true, msg: `🗑️ Đã thu hồi quyền của: ${account}` });
      }
      
      if (action === "reset") {
        const existing = await kv.get(`user_${account}`);
        if (existing) {
          existing.robloxName = null;
          await kv.set(`user_${account}`, existing);
          return res.status(200).json({ success: true, msg: `🔄 Đã mở khóa nick cho: ${account}` });
        }
        return res.status(200).json({ success: false, msg: `❌ Không tìm thấy: ${account}` });
      }
    } catch (error) {
      return res.status(200).json({ success: false, msg: "❌ Lỗi kết nối Database!" });
    }
  }

  // 2. HIỂN THỊ GIAO DIỆN WEB (GET REQUEST)
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DuyHub - Quản Lý Khách Hàng</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #121212; color: #ffffff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .box { background-color: #1e1e24; padding: 30px; border-radius: 10px; width: 350px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #333; }
        h2 { text-align: center; color: #00ff88; margin-top: 0; }
        label { font-size: 13px; color: #aaa; margin-bottom: 5px; display: block; }
        input { width: 100%; padding: 12px; margin-bottom: 15px; border-radius: 5px; border: 1px solid #444; background: #121212; color: #fff; box-sizing: border-box; }
        input:focus { border-color: #00ff88; outline: none; }
        button { width: 100%; padding: 12px; margin-bottom: 10px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.2s; }
        .btn-add { background: #00ff88; color: #000; }
        .btn-add:hover { background: #00cc6a; }
        .btn-reset { background: #f39c12; color: #fff; }
        .btn-reset:hover { background: #d68910; }
        .btn-del { background: #ff4757; color: #fff; }
        .btn-del:hover { background: #ff3344; }
        #log { margin-top: 15px; text-align: center; font-size: 14px; padding: 10px; background: #121212; border-radius: 5px; border: 1px dashed #555; }
    </style>
</head>
<body>
    <div class="box">
        <h2>DUYHUB ADMIN</h2>
        
        <label>Mật khẩu Admin:</label>
        <input type="password" id="pass" placeholder="Nhập mật khẩu...">
        
        <label>Tên khách hàng (VD: khiem):</label>
        <input type="text" id="user" placeholder="Nhập tên tài khoản khách...">
        
        <button class="btn-add" onclick="sendAction('add')">➕ CẤP QUYỀN MỚI</button>
        <button class="btn-reset" onclick="sendAction('reset')">🔄 MỞ KHÓA NICK (RESET)</button>
        <button class="btn-del" onclick="sendAction('del')">🗑️ THU HỒI QUYỀN (XÓA)</button>
        
        <div id="log" style="color: #888;">Trạng thái hệ thống...</div>
    </div>

    <script>
        async function sendAction(action) {
            const pass = document.getElementById('pass').value;
            const account = document.getElementById('user').value;
            const log = document.getElementById('log');

            log.style.color = '#fff';
            log.innerHTML = '⏳ Đang xử lý...';

            try {
                const res = await fetch('/api/admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pass, action, account })
                });
                
                const data = await res.json();
                if (data.success) {
                    log.style.color = '#00ff88';
                } else {
                    log.style.color = '#ff4757';
                }
                log.innerHTML = data.msg;
            } catch (e) {
                log.style.color = '#ff4757';
                log.innerHTML = '❌ Lỗi mất kết nối mạng!';
            }
        }
    </script>
</body>
</html>
  `);
}