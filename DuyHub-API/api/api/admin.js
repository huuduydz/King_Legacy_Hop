import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // 1. ĐẶT MẬT KHẨU ADMIN CỦA BẠN TẠI ĐÂY (Tuyệt đối không cho ai biết)
  const ADMIN_PASSWORD = "3399216308"; 

  const { pass, action, account } = req.query;

  // Kiểm tra mật khẩu Admin
  if (pass !== ADMIN_PASSWORD) {
    return res.status(403).send("❌ CẢNH BÁO: Sai mật khẩu quản trị viên!");
  }

  // Nếu không nhập lệnh gì
  if (!action || !account) {
    return res.send(`
      <h2>🛠️ BẢNG ĐIỀU KHIỂN DUYHUB ADMIN</h2>
      <p><b>Cách thêm khách mới:</b> ?pass=${ADMIN_PASSWORD}&action=add&account=TEN_KHACH</p>
      <p><b>Cách xóa khách:</b> ?pass=${ADMIN_PASSWORD}&action=del&account=TEN_KHACH</p>
      <p><b>Cách Reset HWID/Name:</b> ?pass=${ADMIN_PASSWORD}&action=reset&account=TEN_KHACH</p>
    `);
  }

  try {
    // LỆNH THÊM KHÁCH MỚI
    if (action === "add") {
      // Tạo dữ liệu mặc định: Chưa có tên Roblox (null) và Đang kích hoạt (true)
      const newData = { robloxName: null, active: true };
      await kv.set(`user_${account}`, newData);
      return res.send(`✅ [THÀNH CÔNG] Đã tạo tài khoản cho khách: <b>${account}</b>. Bây giờ họ có thể dùng Script!`);
    }

    // LỆNH XÓA/HỦY KHÁCH HÀNG (Khi hết hạn thuê)
    if (action === "del") {
      await kv.del(`user_${account}`);
      return res.send(`🗑️ [THÀNH CÔNG] Đã xóa vĩnh viễn tài khoản: <b>${account}</b>.`);
    }

    // LỆNH RESET NICK (Khi khách muốn đổi sang nick Roblox khác)
    if (action === "reset") {
      const existing = await kv.get(`user_${account}`);
      if (existing) {
        existing.robloxName = null; // Xóa nick cũ, chờ họ nhập nick mới
        await kv.set(`user_${account}`, existing);
        return res.send(`🔄 [THÀNH CÔNG] Đã Reset tên Roblox cho tài khoản: <b>${account}</b>.`);
      } else {
        return res.send(`❌ Lỗi: Không tìm thấy tài khoản ${account}`);
      }
    }

    return res.send("❌ Lệnh không hợp lệ!");
  } catch (error) {
    return res.status(500).send("❌ Lỗi máy chủ cơ sở dữ liệu!");
  }
}