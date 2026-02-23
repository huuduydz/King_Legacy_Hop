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
  // Cho phép mọi Executor gọi tới
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');

  const userAccount = req.query.account;
  const playerName = req.query.name;

  if (!userAccount || !playerName) {
    return res.status(200).send("DUYHUB_FAIL");
  }

  try {
    const client = await connectDB();
    const db = client.db('DuyHubDB');
    const users = db.collection('Users');

    const accountData = await users.findOne({ account: userAccount });

    // Nếu không có tài khoản hoặc tài khoản bị khóa
    if (!accountData || !accountData.active) {
      return res.status(200).send("DUYHUB_FAIL");
    }

    const allowedNicks = accountData.robloxNames || [];
    
    // Nếu tên nick đang chạy Script KHÔNG NẰM TRONG danh sách Admin cho phép
    if (!allowedNicks.includes(playerName)) {
      return res.status(200).send("DUYHUB_FAIL");
    }

    // Nếu mọi thứ đều đúng -> Cấp phép cho Script chạy tiếp
    return res.status(200).send("DUYHUB_OK");

  } catch (error) {
    return res.status(200).send("DUYHUB_FAIL");
  }
}