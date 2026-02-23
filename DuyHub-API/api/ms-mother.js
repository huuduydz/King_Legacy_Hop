import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // Bật CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');

  const userAccount = req.query.account;
  const playerName = req.query.name;

  if (!userAccount || !playerName) {
    return res.send(`game.Players.LocalPlayer:Kick("❌ Lỗi: Không thể xác thực Tài Khoản hoặc Tên Roblox!")`);
  }

  try {
    const accountData = await kv.get(`user_${userAccount}`);

    if (!accountData || !accountData.active) {
      return res.send(`game.Players.LocalPlayer:Kick("❌ Tài khoản [ ${userAccount} ] không tồn tại hoặc đã hết hạn!")`);
    }

    // Kiểm tra khóa Nick Roblox
    if (accountData.robloxName === null) {
      accountData.robloxName = playerName;
      await kv.set(`user_${userAccount}`, accountData);
      console.log(`[+] Liên kết Account ${userAccount} với Nick: ${playerName}`);
    } else if (accountData.robloxName !== playerName) {
      return res.send(`game.Players.LocalPlayer:Kick("❌ TÀI KHOẢN NÀY ĐÃ BỊ KHÓA VỚI NICK: ${accountData.robloxName}!\\nTuyệt đối không dùng cho nick khác!")`);
    }

    // ================================================================
    // ĐIỂM ĐỘT PHÁ: MÁY CHỦ VERCEL TỰ ĐỘNG LẤY CODE TỪ GITHUB
    // ================================================================
    
    // Link GitHub Raw của bạn
    const githubRawUrl = "https://raw.githubusercontent.com/huuduydz/AutoSam_TpHome/refs/heads/main/HopMs_Mother.lua";
    
    // Vercel tiến hành fetch (tải) nội dung file Lua đó về
    const fetchResponse = await fetch(githubRawUrl);
    
    if (!fetchResponse.ok) {
      return res.send(`game.Players.LocalPlayer:Kick("❌ Máy chủ bảo mật đang bảo trì (Lỗi lấy dữ liệu GitHub)!")`);
    }
    
    const luaCode = await fetchResponse.text();

    // Ghép câu chào mừng vào đầu đoạn code vừa tải được
    const payloadScript = `print("✅ Xác thực DuyHub thành công! Xin chào ${playerName}")\n` + luaCode;

    // Trả về cho khách hàng chạy
    return res.status(200).send(payloadScript);

  } catch (error) {
    return res.send(`game.Players.LocalPlayer:Kick("❌ Lỗi kết nối đến máy chủ Database Vercel!")`);
  }
}
