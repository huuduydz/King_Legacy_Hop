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

  const userAccount = req.query.account;
  const playerName = req.query.name;

  if (!userAccount || !playerName) {
    return res.send(`game.Players.LocalPlayer:Kick("❌ Lỗi: Không thể xác thực Tài Khoản hoặc Tên Roblox!")`);
  }

  try {
    const client = await connectDB();
    const db = client.db('DuyHubDB');
    const users = db.collection('Users');

    // Tìm tài khoản trong MongoDB
    const accountData = await users.findOne({ account: userAccount });

    if (!accountData || !accountData.active) {
      return res.send(`game.Players.LocalPlayer:Kick("❌ Tài khoản [ ${userAccount} ] không tồn tại hoặc đã hết hạn!")`);
    }

    // Kiểm tra khóa Nick Roblox
    if (accountData.robloxName === null) {
      await users.updateOne({ account: userAccount }, { $set: { robloxName: playerName } });
      console.log(`[+] Liên kết Account ${userAccount} với Nick: ${playerName}`);
    } else if (accountData.robloxName !== playerName) {
      return res.send(`game.Players.LocalPlayer:Kick("❌ TÀI KHOẢN NÀY ĐÃ BỊ KHÓA VỚI NICK: ${accountData.robloxName}!\\nTuyệt đối không dùng cho nick khác!")`);
    }

    // FETCH CODE TỪ GITHUB
    const githubRawUrl = "https://raw.githubusercontent.com/huuduydz/AutoSam_TpHome/refs/heads/main/HopMs_Mother.lua";
    const fetchResponse = await fetch(githubRawUrl);
    
    if (!fetchResponse.ok) {
      return res.send(`game.Players.LocalPlayer:Kick("❌ Máy chủ bảo mật đang bảo trì (Lỗi lấy dữ liệu GitHub)!")`);
    }
    
    const luaCode = await fetchResponse.text();
    const payloadScript = `print("✅ Xác thực DuyHub thành công! Xin chào ${playerName}")\n` + luaCode;

    return res.status(200).send(payloadScript);

  } catch (error) {
    return res.send(`game.Players.LocalPlayer:Kick("❌ Lỗi Database MongoDB!")`);
  }
}