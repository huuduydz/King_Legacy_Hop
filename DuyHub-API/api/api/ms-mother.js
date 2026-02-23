import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Bật CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Lấy dữ liệu account và name từ URL
  const userAccount = req.query.account;
  const playerName = req.query.name;

  // Nếu khách không truyền đủ dữ liệu
  if (!userAccount || !playerName) {
    return res.send(`game.Players.LocalPlayer:Kick("❌ Lỗi: Không thể xác thực Tài Khoản hoặc Tên Roblox!")`);
  }

  try {
    // Tìm tài khoản trong Database Vercel KV
    const accountData = await kv.get(`user_${userAccount}`);

    // Kiểm tra tài khoản có tồn tại hay không
    if (!accountData || !accountData.active) {
      return res.send(`game.Players.LocalPlayer:Kick("❌ Tài khoản [ ${userAccount} ] không tồn tại hoặc đã bị khóa!")`);
    }

    // --- KIỂM TRA BẢO MẬT BẰNG TÊN ROBLOX (ROBLOX NAME) ---
    if (accountData.robloxName === null) {
      // Nếu là lần ĐẦU TIÊN chạy -> Khóa vĩnh viễn Key này với Tên Roblox hiện tại
      accountData.robloxName = playerName;
      await kv.set(`user_${userAccount}`, accountData);
      console.log(`[+] Đã liên kết Account ${userAccount} với Nick Roblox: ${playerName}`);
    } else if (accountData.robloxName !== playerName) {
      // Nếu Key này đem cho một Nick Roblox khác xài ké -> KICK thẳng cổ
      return res.send(`game.Players.LocalPlayer:Kick("❌ TÀI KHOẢN NÀY ĐÃ ĐƯỢC LIÊN KẾT VỚI NICK ROBLOX: ${accountData.robloxName}!\\nKhông thể dùng cho nick khác!")`);
    }

    // --- NẾU ĐÚNG NICK ROBLOX -> TRẢ VỀ SCRIPT SĂN BOSS ---
    // (Dán code V31.1 đã Obfuscate của bạn vào giữa 2 dấu ` ` dưới đây)
    const payloadScript = `
      print("✅ Xác thực thành công! Xin chào ${playerName}")
      
      -- DÁN TOÀN BỘ CODE V31.1 ĐÃ OBFUSCATE CỦA BẠN VÀO ĐÂY --
      
    `;

    return res.status(200).send(payloadScript);

  } catch (error) {
    return res.send(`game.Players.LocalPlayer:Kick("❌ Lỗi kết nối đến máy chủ Database DuyHub!")`);
  }
}