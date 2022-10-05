require("dotenv").config();
const cron = require("node-cron");
const TelegramBot = require("node-telegram-bot-api");
const { Client } = require("@elastic/elasticsearch");

///==================
/// ELASTICSEARCH AUTH LOGIN TO SERVER
///=================

const client = new Client({
  node: process.env.ELASTIC_URL,
  auth: {
    username: process.env.ELASTIC_USERNAME,
    password: process.env.ELASTIC_PASSWORD,
  },
});

///==================
/// TELEGRAM BOT AUTH
///==================
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token);
const chatId = process.env.TELEGRAM_CHAT_ID;

///=================
/// CRON JOB SETIAP 1 MENIT
///=================

const task = cron.schedule("* * * * *", () => {
  run().catch(console.log);
});

var itung = 0;
///==================
/// ELASTICSEARCH COUNTING JUMLAH DATA DI INDEX
///==================
async function run() {
  const count = await client.count({
    index: process.env.ELASTIC_INDEX,
    body: {
      query: {
        match_all: {},
      },
    },
  });

  ///==================
  /// ELASTICSEARCH CARI DATA TERBARU DAN KIRIM KE TELEGRAM
  ///==================
  const getQuery = await client.search({
    index: process.env.ELASTIC_INDEX,
    body: {
      query: {
        match_all: {},
      },
    },
    size: count.count,
    sort: [
      {
        timestamp: {
          order: "desc",
        },
      },
    ],
  });

  if (itung != count.count || itung > count.count) {
    bot.sendMessage(
      chatId,
      `[${getQuery.hits.hits.map((item) => item._source.Condition)[0]}] ${
        getQuery.hits.hits.map((item) => item._source.Reason)[0]
      }`
    );
    console.log("Ada data baru dan kirim pesan");
  } else {
    console.log("Ga ada Update yang harus dikirim");
  }
  itung = count.count;

  //=============
  //BUAT DEBUG
  //=============
  // const lastItem = getQuery.hits.hits
  //   .map((item) => item._source.value)[0];

  // console.log(lastItem);
}

task.start();
//=============
//BUAT DEBUG
//=============
// run().catch(console.log);
