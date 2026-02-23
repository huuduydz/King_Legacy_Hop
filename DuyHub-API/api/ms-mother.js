import { MongoClient } from 'mongodb';

let cachedClient = null;
async function connectDB() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');

  const userAccount = req.query.account; // Ví dụ: "khiem"
  const playerName = req.query.name;     // Ví dụ: "khiem2" (Tên trong game)

  if (!userAccount || !playerName) {
    return res.send(`game.Players.LocalPlayer:Kick("❌ Lỗi: Thiếu _G.account hoặc Tên ingame Roblox!")`);
  }

  try {
    const client = await connectDB();
    const db = client.db('DuyHubDB');
    const users = db.collection('Users');

    const accountData = await users.findOne({ account: userAccount });

    // 1. Kiểm tra User có mua Script không
    if (!accountData || !accountData.active) {
      return res.send(`game.Players.LocalPlayer:Kick("❌ User [ ${userAccount} ] không tồn tại hoặc đã hết hạn thuê Script!")`);
    }

    // 2. Lấy danh sách Nick Roblox mà Admin đã gán cho User này
    const allowedNicks = accountData.robloxNames || [];
    
    // Nếu Admin chưa add nick Roblox nào
    if (allowedNicks.length === 0) {
        return res.send(`game.Players.LocalPlayer:Kick("❌ User [ ${userAccount} ] chưa được Admin Duy cấp quyền cho bất kỳ nick Roblox nào!")`);
    }

    // Nếu tên đang chạy KHÔNG NẰM TRONG danh sách được Admin cho phép
    if (!allowedNicks.includes(playerName)) {
        return res.send(`game.Players.LocalPlayer:Kick("❌ Nick Roblox [ ${playerName} ] KHÔNG ĐƯỢC PHÉP sử dụng gói Script của User [ ${userAccount} ]!")`);
    }

    // ================================================================
    // FETCH CODE TỪ GITHUB (KHI XÁC THỰC THÀNH CÔNG)
    // ================================================================
    const githubRawUrl = "https://raw.githubusercontent.com/huuduydz/AutoSam_TpHome/refs/heads/main/HopMs_Mother.lua";
    const fetchResponse = await fetch(githubRawUrl);
    
    if (!fetchResponse.ok) {
      return res.send(`game.Players.LocalPlayer:Kick("❌ Máy chủ bảo mật DuyHub đang bảo trì (Lỗi Github)!")`);
    }
    
    const luaCode = await fetchResponse.text();
    const payloadScript = `print("✅ Xác thực DuyHub thành công! Chào mừng ${playerName} đã trở lại.")\n` + luaCode;

    return res.status(200).send(payloadScript);

  } catch (error) {
    return res.send(`game.Players.LocalPlayer:Kick("❌ Lỗi kết nối Database MongoDB DuyHub!")`);
  }
}