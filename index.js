const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Aplinkos kintamieji (ENV) – dabar užrašyti čia, bet vėliau perkelsim
const ASANA_TOKEN = process.env.ASANA_TOKEN;
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK;
const ASANA_PROJECT_ID = process.env.ASANA_PROJECT_ID;

// Testinis endpoint – patikrinti ar veikia
app.get("/", (req, res) => {
  res.send("Asana → Slack integracija veikia 🚀");
});

// Webhook endpoint iš Asana
app.post("/asana-webhook", async (req, res) => {
  // Asana handshake
  if (req.headers["x-hook-secret"]) {
    res.setHeader("X-Hook-Secret", req.headers["x-hook-secret"]);
    return res.status(200).end();
  }

  // Jei įvykiai atėjo
  const events = req.body.events;
  if (events && events.length > 0) {
    for (let event of events) {
      try {
        // Paimam task info iš Asana
        const taskResp = await axios.get(
          `https://app.asana.com/api/1.0/tasks/${event.resource.gid}`,
          {
            headers: { Authorization: `Bearer ${ASANA_TOKEN}` },
          }
        );

        const task = taskResp.data.data;
        const fields = task.custom_fields || [];

        const city = fields.find(f => f.name === "Miestas")?.enum_value?.name || "—";
        const opening = fields.find(f => f.name === "Atidarymas")?.enum_value?.name || "—";
        const alley = fields.find(f => f.name === "Alėja")?.text_value || "—";

        const slackMessage = {
          text: `*${task.name}* \nDue: ${task.due_on || "—"} \nMiestas: ${city} \nAtidarymas: ${opening} \nAlėja: ${alley} \n${task.permalink_url}`
        };

        await axios.post(SLACK_WEBHOOK, slackMessage);

      } catch (err) {
        console.error("Klaida gaunant task info:", err.message);
      }
    }
  }

  res.status(200).end();
});

// Start server
app.listen(PORT, () => {
  console.log(`Serveris paleistas ant porto ${PORT}`);
});
