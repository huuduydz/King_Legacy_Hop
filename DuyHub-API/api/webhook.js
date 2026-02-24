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

    // 1. Lấy Key, Tên, và cái Bảng giao diện (Embed) từ Lua gửi lên
    const { account, playerName, discordEmbed } = req.body;

    if (!account || !playerName) {
        return res.status(200).json({ success: true, msg: "Cố tình Spam à? Đâu có dễ :)" }); // Giả vờ thành công để lừa tool Spam
    }

    try {
        const client = await connectDB();
        const db = client.db('DuyHubDB');
        const users = db.collection('Users');

        // 2. SOÁT VÉ (WHITELIST CHECK)
        const accountData = await users.findOne({ account: account });
        if (!accountData || !accountData.active) {
            return res.status(200).json({ success: true, msg: "Lỗi Key" }); // Từ chối ngầm
        }
        
        const allowedNicks = accountData.robloxNames || [];
        if (!allowedNicks.includes(playerName)) {
            return res.status(200).json({ success: true, msg: "Lỗi Tên" }); // Từ chối ngầm
        }

        // 3. LẤY LINK DISCORD TỪ TRONG KÉT SẮT VERCEL 
        // (Nhớ thêm SECRET_WEBHOOK_URL vào biến môi trường của Vercel nhé!)
        const webhookUrl = process.env.SECRET_WEBHOOK_URL;
        
        if (!webhookUrl) return res.status(500).json({ error: 'Chưa cài webhook trong cài đặt Vercel' });

        // 4. BẮN LÊN DISCORD
        const payload = { embeds: [discordEmbed] };

        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        return res.status(200).json({ success: true, message: 'Đã gửi an toàn!' });

    } catch (error) {
        return res.status(500).json({ error: 'Lỗi hệ thống' });
    }
}