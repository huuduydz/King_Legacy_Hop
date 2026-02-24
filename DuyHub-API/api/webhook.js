import { MongoClient } from 'mongodb';

// Giữ kết nối Database để chạy nhanh hơn (không bị lag)
let cachedClient = null;
async function connectDB() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    // 1. Cấp quyền cho Script
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Chỉ nhận phương thức POST' });
    }

    // 2. Lấy toàn bộ dữ liệu từ Script Roblox gửi lên
    const { account, playerName, title, name, content } = req.body;

    // Nếu thiếu Key bảo mật hoặc Tên người chơi -> Bỏ qua
    if (!account || !playerName) {
        // Trả về 200 để lừa tool Spam của Hacker
        return res.status(200).json({ success: true, msg: "Spam vui vẻ nhé lêu lêu!" });
    }

    try {
        // 3. KẾT NỐI MONGODB VÀ KIỂM TRA WHITELIST
        const client = await connectDB();
        const db = client.db('DuyHubDB');
        const users = db.collection('Users');

        // Tìm Key trong Database
        const accountData = await users.findOne({ account: account });

        // NẾU TÀI KHOẢN KHÔNG TỒN TẠI, BỊ KHÓA, HOẶC SAI TÊN NICK -> CHẶN!
        if (!accountData || !accountData.active) {
            return res.status(200).json({ success: true, msg: "Key sai hoặc hết hạn" });
        }
        
        const allowedNicks = accountData.robloxNames || [];
        if (!allowedNicks.includes(playerName)) {
            return res.status(200).json({ success: true, msg: "Nick Roblox không có quyền" });
        }

        // ==============================================================
        // 4. QUA ĐƯỢC CỬA BẢO VỆ -> TIẾN HÀNH BẮN WEBHOOK LÊN DISCORD
        // ==============================================================
        const webhookUrl = process.env.SECRET_WEBHOOK_URL;
        if (!webhookUrl) {
            return res.status(500).json({ error: 'Sếp Duy chưa cài Link Webhook trên Vercel!' });
        }

        const payload = {
            embeds: [{
                title: title || "👑 DuyHub Notify",
                color: 0x00FF00, 
                fields: [
                    { name: name || "Thông tin:", value: content || "Trống" }
                ],
                // Thêm dòng chú thích nhỏ ở dưới để biết khách nào đang bắn log
                footer: { text: `DuyHub Security • Authenticated: ${playerName}` }
            }]
        };

        const discordRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        return res.status(200).json({ success: true, message: 'Webhook đã được gửi an toàn!' });

    } catch (error) {
        return res.status(500).json({ error: 'Lỗi máy chủ Vercel' });
    }
}