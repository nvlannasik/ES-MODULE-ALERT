require("dotenv").config();
const cron = require("cron").CronJob;
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

const task = new cron(" * * * * *", function () {
  run().catch(console.log);
});

///==================
/// ELASTICSEARCH COUNTING JUMLAH DATA DI INDEX
///==================
async function run() {
  const countAlertFlag = await client.count({
    index: process.env.ELASTIC_INDEX,
    body: {
      query: {
        match: {
          rulesFlag: 0,
        },
      },
    },
  });

  const countRecoverFlag = await client.count({
    index: process.env.ELASTIC_INDEX,
    body: {
      query: {
        match: {
          rulesFlag: 1,
        },
      },
    },
  });

  const checkFlagAlert = await client.search({
    index: process.env.ELASTIC_INDEX,
    body: {
      query: {
        match: {
          rulesFlag: 0,
        },
      },
    },
  });

  const checkFlagRecovers = await client.search({
    index: process.env.ELASTIC_INDEX,
    body: {
      query: {
        match: {
          rulesFlag: 1,
        },
      },
    },
  });

  if (
    checkFlagAlert.hits.hits.map((x) => x._source.rulesFlag).includes(0) == true
  ) {
    console.log("Ada Alert jumlahnya " + countAlertFlag.count + "");
    for (let i = 0; i < countAlertFlag.count; i++) {
      bot.sendMessage(
        chatId,
        `[Alert] ${checkFlagAlert.hits.hits.map((x) => x._source.reason)[i]} `
      );
      //update flag
      await client.updateByQuery({
        index: process.env.ELASTIC_INDEX,
        body: {
          script: {
            source: "ctx._source.rulesFlag = 3",
            params: {
              rulesFlag: 3,
            },
          },
          query: {
            match: {
              rulesFlag: 0,
            },
          },
          conflicts: "proceed",
        },
      });
    }
  } else if (
    checkFlagRecovers.hits.hits.map((x) => x._source.rulesFlag).includes(1) ==
    true
  ) {
    console.log("Ada Recover jumlahnya " + countRecoverFlag.count + "");
    for (let i = 0; i < countRecoverFlag.count; i++) {
      bot.sendMessage(
        chatId,
        `[Recover] ${
          checkFlagRecovers.hits.hits.map((x) => x._source.Alert_ID)[i]
        }`
      );

      //update flag
      await client.updateByQuery({
        index: process.env.ELASTIC_INDEX,
        body: {
          script: {
            source: "ctx._source.rulesFlag = 3",
            params: {
              rulesFlag: 3,
            },
          },
          query: {
            match: {
              rulesFlag: 1,
            },
          },
          conflicts: "proceed",
        },
      });
    }
  } else {
    console.log("Tidak ada Alert dan Recover");
  }
  //=============
  //BUAT DEBUG
  //=============
  // const lastItem = checkFlagAlert.hits.hits._source;

  // console.log(lastItem);
}

task.start();
//=============
//BUAT DEBUG
//=============
// run().catch(console.log);
