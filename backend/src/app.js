const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require('./db'); // caminho correto para o arquivo que exporta a conexão


const agenciesRoutes = require("./routes/agencies");
const adminRoutes = require("./routes/admin");

const app = express(); // ✅ app criado aqui

app.use(cors({
  origin: "https://nexturpay.digital" // substitua pela URL real do seu Netlify
}));
/* Middlewares */
app.use(cors());
app.use(express.json());

/* Frontend estático */
app.use(
  express.static(
    path.join(__dirname, "../../frontend")
  )
);

/* Rotas API */
app.use("/api/agencies", agenciesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/admin", express.static(path.join(__dirname, "../frontend")));

/* Fallback para SPA */
app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../../frontend/index.html")
  );
});

app.patch("/api/admin/report-status", async (req, res) => {
  const { agency_code, reference, pago } = req.body;

  // Verifica apenas agency_code e reference
  if (!agency_code || !reference) {
    return res.status(400).json({ error: "Parâmetros obrigatórios faltando" });
  }

  if (typeof pago !== "boolean") {
    return res.status(400).json({ error: "Campo 'pago' deve ser boolean" });
  }

  try {
    // Atualiza todos os reservation_code da referência
    await db.query(
      "UPDATE sales_history SET pago = $1 WHERE agency_code = $2 AND reference = $3",
      [pago, agency_code, reference]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar relatório" });
  }
});






module.exports = app;
