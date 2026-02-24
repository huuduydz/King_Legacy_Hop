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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Chỉ nhận phương thức POST' });

    const { account, playerName, discordEmbed } = req.body;
    
    // GHI LOG BƯỚC 1: XEM CÓ NHẬN ĐƯỢC DỮ LIỆU TỪ GAME KHÔNG
    console.log(`[1] Đang xử lý Webhook cho Nick: ${playerName} | Key: ${account}`);

    if (!account || !playerName) {
        console.log(`[X] Thiếu Key hoặc Tên. Đã chặn!`);
        return res.status(200).json({ success: true, msg: "Cố tình Spam à?" }); 
    }

    try {
        const client = await connectDB();
        const db = client.db('DuyHubDB');
        const users = db.collection('Users');

        const accountData = await users.findOne({ account: account });
        
        // GHI LOG BƯỚC 2: KIỂM TRA MONGODB
        if (!accountData || !accountData.active) {
            console.log(`[X] Key ${account} không tồn tại hoặc bị khóa. Đã chặn!`);
            return res.status(200).json({ success: true, msg: "Lỗi Key" });
        }
        
        const allowedNicks = accountData.robloxNames || [];
        if (!allowedNicks.includes(playerName)) {
            console.log(`[X] Nick ${playerName} không có trong danh sách. Đã chặn!`);
            return res.status(200).json({ success: true, msg: "Lỗi Tên" }); 
        }

        const webhookUrl = process.env.SECRET_WEBHOOK_URL;
        if (!webhookUrl) {
            console.log(`[X] LỖI NẶNG: Vercel không tìm thấy SECRET_WEBHOOK_URL!`);
            return res.status(500).json({ error: 'Chưa cài webhook' });
        }

        // GHI LOG BƯỚC 3: QUA CỬA BẢO VỆ, BẮT ĐẦU BẮN DISCORD
        console.log(`[2] Whitelist OK! Đang bắn lên Discord...`);
        const payload = { embeds: [discordEmbed] };

        const discordRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (discordRes.ok) {
            console.log(`[3] THÀNH CÔNG! Discord đã nhận tin nhắn.`);
            return res.status(200).json({ success: true, message: 'Đã gửi an toàn!' });
        } else {
            console.log(`[X] LỖI TỪ DISCORD: Payload sai định dạng!`);
            return res.status(500).json({ error: 'Discord từ chối' });
        }

    } catch (error) {
        console.log(`[X] LỖI SERVER: ${error.message}`);
        return res.status(500).json({ error: 'Lỗi hệ thống' });
    }
}