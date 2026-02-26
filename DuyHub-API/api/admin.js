import { MongoClient } from 'mongodb';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "3399216308";

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
  // 1. XỬ LÝ LỆNH TỪ API (POST)
  // =================================================================
  if (req.method === 'POST') {
    const { pass, action, account, robloxList, status, days } = req.body;

    await new Promise(resolve => setTimeout(resolve, 500)); // Chống spam dò pass

    if (pass !== ADMIN_PASSWORD) return res.status(200).json({ success: false, msg: "❌ Sai mật khẩu Admin!" });

    try {
      const client = await connectDB();
      const db = client.db('DuyHubDB');
      const users = db.collection('Users');

      if (action === "list") {
        const allUsers = await users.find({}).sort({ _id: -1 }).toArray();
        return res.status(200).json({ success: true, data: allUsers });
      }

      if (!account || account.trim() === "") return res.status(200).json({ success: false, msg: "❌ Vui lòng nhập Tên User của khách hàng!" });
      const targetUser = account.trim();

      // LỆNH LƯU HOẶC CẬP NHẬT
      if (action === "save") {
        let nicks = [];
        if (robloxList && robloxList.trim() !== "") {
          nicks = robloxList.split(/[\n,]+/).map(a => a.trim()).filter(a => a !== "");
        }
        
        const isActive = status !== undefined ? status : true;
        let updateFields = { account: targetUser, robloxNames: nicks, active: isActive };

        // LOGIC CỘNG NGÀY THUÊ THÔNG MINH
        if (days && !isNaN(days) && parseInt(days) > 0) {
            const addedMs = parseInt(days) * 24 * 60 * 60 * 1000; // Đổi ngày ra mili-giây
            const existingUser = await users.findOne({ account: targetUser });
            
            let newExpireAt = Date.now() + addedMs;
            // Nếu khách vẫn đang còn hạn -> Cộng dồn vào hạn cũ
            if (existingUser && existingUser.expireAt && existingUser.expireAt > Date.now()) {
                newExpireAt = existingUser.expireAt + addedMs;
            }
            updateFields.expireAt = newExpireAt;
        } else if (days === "0" || days === 0) {
            // Nếu nhập 0 -> Set thành Vĩnh viễn (Xóa hạn sử dụng)
            updateFields.expireAt = null; 
        }

        await users.updateOne(
          { account: targetUser },
          { $set: updateFields },
          { upsert: true }
        );
        return res.status(200).json({ success: true, msg: `✅ Đã lưu User: <b>${targetUser}</b> (${nicks.length} nick)` });
      } 
      
      else if (action === "toggle") {
        await users.updateOne({ account: targetUser }, { $set: { active: status } });
        return res.status(200).json({ success: true, msg: `🔄 Đã ${status ? 'Mở khóa' : 'Khóa'} User: <b>${targetUser}</b>` });
      }

      else if (action === "del") {
        const result = await users.deleteOne({ account: targetUser });
        if (result.deletedCount > 0) {
          return res.status(200).json({ success: true, msg: `🗑️ Đã thu hồi & Xóa User: <b>${targetUser}</b>` });
        } else {
          return res.status(200).json({ success: false, msg: `❌ Không tìm thấy User: <b>${targetUser}</b>` });
        }
      }
    } catch (error) {
      return res.status(200).json({ success: false, msg: "❌ Lỗi Database! Kiểm tra lại kết nối." });
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
        <title>DuyHub - Admin Dashboard</title>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
        <style>
            :root { --bg: #0b0c10; --panel: #1f2833; --primary: #66fcf1; --secondary: #45a29e; --text: #c5c6c7; --danger: #ff4757; --success: #2ed573; --warning: #ffa502;}
            body { font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
            h2 { color: var(--primary); text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-bottom: 30px;}
            
            #authOverlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(11, 12, 16, 0.95); display: flex; justify-content: center; align-items: center; z-index: 1000; flex-direction: column; }
            #authOverlay input { padding: 15px; font-size: 18px; text-align: center; width: 300px; border-radius: 8px; border: 2px solid var(--primary); background: transparent; color: white; outline: none; margin-bottom: 15px;}
            #authOverlay button { flex: none; width: 300px; padding: 12px 30px; font-size: 16px; border-radius: 8px; background: var(--primary); color: #000; border: none; cursor: pointer; font-weight: bold;}

            .dashboard { display: none; width: 100%; max-width: 1200px; gap: 20px; grid-template-columns: 1fr 2fr; }
            .panel { background: var(--panel); padding: 25px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid rgba(102, 252, 241, 0.2); }
            
            .input-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: bold; color: var(--secondary); }
            input, textarea { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #333; background: #12151c; color: white; font-size: 14px; outline: none; box-sizing: border-box; transition: 0.3s; }
            input:focus, textarea:focus { border-color: var(--primary); box-shadow: 0 0 10px rgba(102, 252, 241, 0.2); }
            textarea { resize: vertical; min-height: 100px; font-family: monospace; }
            
            .btn-group { display: flex; gap: 10px; }
            button { flex: 1; padding: 12px; border-radius: 8px; border: none; font-size: 14px; font-weight: bold; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;}
            button:active { transform: scale(0.95); }
            .btn-save { background: rgba(46, 213, 115, 0.1); color: var(--success); border: 1px solid var(--success); }
            .btn-save:hover { background: var(--success); color: #000; }
            .btn-del { background: rgba(255, 71, 87, 0.1); color: var(--danger); border: 1px solid var(--danger); }
            .btn-del:hover { background: var(--danger); color: white; }
            .btn-clear { background: transparent; color: var(--text); border: 1px solid var(--text); margin-top: 10px;}
            .btn-clear:hover { background: var(--text); color: #000; }

            .table-container { overflow-x: auto; max-height: 600px; overflow-y: auto; }
            table { width: 100%; border-collapse: collapse; text-align: left; }
            th { position: sticky; top: 0; background: #151b22; color: var(--primary); padding: 15px; font-size: 14px; z-index: 10; border-bottom: 2px solid var(--primary); white-space: nowrap;}
            td { padding: 15px; border-bottom: 1px solid #333; font-size: 14px; vertical-align: middle; }
            tr:hover { background: rgba(255,255,255,0.05); }
            .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .badge.active { background: rgba(46, 213, 115, 0.2); color: var(--success); }
            .badge.inactive { background: rgba(255, 71, 87, 0.2); color: var(--danger); }
            .nick-list { font-family: monospace; color: #aaa; font-size: 13px; max-width: 200px; word-wrap: break-word;}
            
            .action-icon { cursor: pointer; margin: 0 5px; font-size: 16px; transition: 0.2s; }
            .action-icon:hover { transform: scale(1.2); }
            .icon-edit { color: var(--primary); }
            .icon-ban { color: var(--warning); }
            .icon-check { color: var(--success); }
            .icon-trash { color: var(--danger); }

            #toast { visibility: hidden; min-width: 250px; background-color: #333; color: #fff; text-align: center; border-radius: 8px; padding: 16px; position: fixed; z-index: 1001; right: 30px; bottom: 30px; font-size: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); opacity: 0; transition: opacity 0.5s, visibility 0.5s; }
            #toast.show { visibility: visible; opacity: 1; }

            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: var(--bg); }
            ::-webkit-scrollbar-thumb { background: var(--secondary); border-radius: 4px; }

            @media (max-width: 768px) { .dashboard { grid-template-columns: 1fr; } }
        </style>
    </head>
    <body>

        <div id="authOverlay">
            <h2><i class="fa-solid fa-shield-halved"></i> Xác Thực Quản Trị</h2>
            <input type="password" id="loginPass" placeholder="Nhập mật khẩu Admin..." onkeypress="if(event.key === 'Enter') login()">
            <button onclick="login()">Truy Cập</button>
        </div>

        <h2 id="headerTitle" style="display: none;"><i class="fa-solid fa-crown"></i> DuyHub Control Panel</h2>

        <div class="dashboard" id="dashboard">
            
            <div class="panel">
                <h3 style="margin-top:0; border-bottom: 1px solid #333; padding-bottom: 10px;"><i class="fa-solid fa-user-pen"></i> Chỉnh Sửa Thông Tin</h3>
                
                <div class="input-group">
                    <label>Tên Khách Hàng:</label>
                    <input type="text" id="username" placeholder="VD: khach_vip_1">
                </div>

                <div class="input-group">
                    <label>Danh sách Nick Roblox:</label>
                    <textarea id="robloxList" placeholder="Nhập tên ingame Roblox...&#10;Mỗi tên 1 dòng hoặc cách nhau dấu phẩy"></textarea>
                </div>

                <div class="input-group">
                    <label>Cộng thêm ngày thuê:</label>
                    <input type="number" id="rentalDays" placeholder="Nhập số (VD: 7). Để trống = Không đổi. Nhập 0 = Vĩnh viễn.">
                </div>

                <div class="btn-group">
                    <button class="btn-save" onclick="executeAction('save')"><i class="fa-solid fa-floppy-disk"></i> Lưu User</button>
                    <button class="btn-del" onclick="promptDelete()"><i class="fa-solid fa-trash-can"></i> Xóa User</button>
                </div>
                <button class="btn-clear" onclick="clearForm()"><i class="fa-solid fa-rotate-right"></i> Làm mới Form</button>
            </div>

            <div class="panel">
                <h3 style="margin-top:0; border-bottom: 1px solid #333; padding-bottom: 10px; display: flex; justify-content: space-between;">
                    <span><i class="fa-solid fa-users"></i> Danh Sách Khách Hàng</span>
                    <i class="fa-solid fa-rotate" style="cursor: pointer; color: var(--primary);" onclick="loadUsers()" title="Tải lại danh sách"></i>
                </h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Tài khoản</th>
                                <th>Nick Roblox</th>
                                <th>Trạng thái</th>
                                <th>Hạn sử dụng</th>
                                <th style="text-align: right;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody id="userTableBody">
                            <tr><td colspan="5" style="text-align: center;">Đang tải dữ liệu...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="toast"></div>

        <script>
            let adminPassword = localStorage.getItem("duyhub_admin_pass") || "";
            let currentUsers = [];

            window.onload = () => { if (adminPassword) verifyAndLoad(); };

            function login() {
                adminPassword = document.getElementById('loginPass').value;
                verifyAndLoad();
            }

            async function verifyAndLoad() {
                try {
                    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pass: adminPassword, action: "list" }) });
                    const data = await res.json();
                    if (data.success) {
                        localStorage.setItem("duyhub_admin_pass", adminPassword);
                        document.getElementById('authOverlay').style.display = 'none';
                        document.getElementById('headerTitle').style.display = 'block';
                        document.getElementById('dashboard').style.display = 'grid';
                        renderTable(data.data);
                    } else {
                        localStorage.removeItem("duyhub_admin_pass");
                        adminPassword = "";
                        showToast(data.msg, "#ff4757");
                    }
                } catch (err) { showToast("❌ Lỗi mạng!", "#ff4757"); }
            }

            async function loadUsers() {
                const tbody = document.getElementById('userTableBody');
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải...</td></tr>';
                try {
                    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pass: adminPassword, action: "list" }) });
                    const data = await res.json();
                    if (data.success) renderTable(data.data);
                } catch (e) { showToast("❌ Không thể tải danh sách", "#ff4757"); }
            }

            function formatDate(ms) {
                if (!ms) return "<span style='color:#00ff88; font-weight:bold;'>Vĩnh viễn</span>";
                const isExpired = Date.now() > ms;
                const d = new Date(ms);
                const timeStr = d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
                return isExpired ? \`<span style='color:#ff4757; text-decoration:line-through;'>\${timeStr}</span><br><span style='font-size:11px; color:#ff4757;'>(Đã hết hạn)</span>\` : \`<span style='color:#c5c6c7;'>\${timeStr}</span>\`;
            }

            function renderTable(users) {
                currentUsers = users;
                const tbody = document.getElementById('userTableBody');
                if (users.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #aaa;">Chưa có khách hàng nào.</td></tr>';
                    return;
                }

                let html = '';
                users.forEach(u => {
                    const isExpired = u.expireAt && Date.now() > u.expireAt;
                    const statusBadge = (u.active && !isExpired) 
                        ? '<span class="badge active"><i class="fa-solid fa-check"></i> Hoạt động</span>' 
                        : '<span class="badge inactive"><i class="fa-solid fa-ban"></i> Bị khóa/Hết hạn</span>';
                    
                    const toggleIcon = u.active 
                        ? '<i class="fa-solid fa-lock action-icon icon-ban" title="Khóa user này" onclick="toggleUser(\\'' + u.account + '\\', false)"></i>'
                        : '<i class="fa-solid fa-unlock action-icon icon-check" title="Mở khóa user này" onclick="toggleUser(\\'' + u.account + '\\', true)"></i>';

                    html += \`
                        <tr>
                            <td><strong>\${u.account}</strong></td>
                            <td><div class="nick-list">\${(u.robloxNames || []).join(', ') || '<em>Trống</em>'}</div></td>
                            <td>\${statusBadge}</td>
                            <td>\${formatDate(u.expireAt)}</td>
                            <td style="text-align: right; white-space:nowrap;">
                                \${toggleIcon}
                                <i class="fa-solid fa-pen-to-square action-icon icon-edit" title="Sửa" onclick="editUser(\\'\${u.account}\\')"></i>
                                <i class="fa-solid fa-trash action-icon icon-trash" title="Xóa" onclick="deleteUserDirect(\\'\${u.account}\\')"></i>
                            </td>
                        </tr>
                    \`;
                });
                tbody.innerHTML = html;
            }

            async function executeAction(actionType, targetAccount = null, targetStatus = null) {
                const account = targetAccount || document.getElementById('username').value;
                const robloxList = document.getElementById('robloxList').value;
                const days = document.getElementById('rentalDays').value;

                if (!account) return showToast("❌ Vui lòng nhập Tên Khách Hàng!", "#ff4757");

                const payload = { pass: adminPassword, action: actionType, account, robloxList, days };
                if (targetStatus !== null) payload.status = targetStatus;

                try {
                    const res = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    const data = await res.json();

                    if (data.success) {
                        showToast(data.msg, "#2ed573");
                        if (actionType === 'save' || actionType === 'del') clearForm();
                        loadUsers(); 
                    } else { showToast(data.msg, "#ff4757"); }
                } catch (err) { showToast("❌ Lỗi mạng!", "#ff4757"); }
            }

            function promptDelete() {
                const acc = document.getElementById('username').value;
                if (!acc) return showToast("❌ Nhập tài khoản cần xóa vào khung!", "#ffa502");
                deleteUserDirect(acc);
            }

            function deleteUserDirect(acc) {
                if (confirm(\`⚠️ XÓA HOÀN TOÀN TÀI KHOẢN [ \${acc} ] ?\\nKhông thể hoàn tác!\`)) executeAction('del', acc);
            }

            function toggleUser(acc, newStatus) { executeAction('toggle', acc, newStatus); }

            function editUser(acc) {
                const user = currentUsers.find(u => u.account === acc);
                if (user) {
                    document.getElementById('username').value = user.account;
                    document.getElementById('robloxList').value = (user.robloxNames || []).join('\\n');
                    document.getElementById('rentalDays').value = ""; // Sửa thì ko cần điền lại ngày
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    showToast("Đã lấy thông tin lên Form sửa.", "#66fcf1");
                }
            }

            function clearForm() {
                document.getElementById('username').value = "";
                document.getElementById('robloxList').value = "";
                document.getElementById('rentalDays').value = "";
            }

            function showToast(msg, color) {
                const toast = document.getElementById("toast");
                toast.innerHTML = msg; toast.style.backgroundColor = color;
                toast.style.color = (color === "#66fcf1" || color === "#2ed573" || color === "#ffa502") ? "#000" : "#fff";
                toast.className = "show";
                setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
            }
        </script>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}