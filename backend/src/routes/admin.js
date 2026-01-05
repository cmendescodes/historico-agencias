const express = require("express");
const multer = require("multer");
const parsePdf = require("../services/pdfParser");
const db = require("../db");

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    const nameMatch = req.file.originalname.match(/(\d{4}-\d{2}-\d{2})/);

    if (!nameMatch) {
      return res.status(400).json({
        error: "Nome do arquivo não contém data válida (YYYY-MM-DD)"
      });
    }

    const referenceDate = nameMatch[1];
    // 🔎 Parse do PDF
    const result = await parsePdf(req.file.buffer, referenceDate);

    const rows = result.rows;

    if (!rows || !rows.length) {
      return res
        .status(400)
        .json({ error: "Nenhuma reserva válida encontrada no PDF" });
    }

    // 🔁 Processa cada reserva individualmente
    for (const row of rows) {
      const {
        reservation,
        agency,
        repasse,
        credito
      } = row;

      // 1️⃣ Garante que a agência exista
      await db.query(
        `
        INSERT INTO agencies (code)
        VALUES ($1)
        ON CONFLICT (code) DO NOTHING
        `,
        [agency]
      );

      // 2️⃣ Insere a reserva no histórico
      await db.query(
        `
        INSERT INTO sales_history
        (
          reservation_code,
          agency_code,
          reference,
          repasse,
          credito
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          reservation,
          agency,
          result.reference,
          repasse,
          credito
        ]
      );
    }

    res.json({
      success: true,
      reference: result.reference,
      total_reservas: rows.length
    });
  } catch (err) {
    console.error("Erro no upload do PDF:", err);
    res.status(500).json({ error: "Erro ao processar o PDF" });
  }
});

router.patch("/sales/:id/status", async (req, res) => {
  const { status } = req.body;

  if (!["ABERTO", "FATURADO"].includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }

  await db.query(
    "UPDATE sales_history SET status = $1 WHERE id = $2",
    [status, req.params.id]
  );

  res.json({ success: true, reference: result.reference });
});

router.patch("/sales/:id/repasse", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  await db.query(
    "UPDATE sales_history SET repasse_status=$1 WHERE id=$2",
    [status, id]
  );

  res.json({ success: true });
});

router.patch("/sales/:id/credito", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  await db.query(
    "UPDATE sales_history SET credito_status=$1 WHERE id=$2",
    [status, id]
  );

  res.json({ success: true });
});
router.patch("/sales/:id/repasse", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  await db.query(
    "UPDATE sales_history SET repasse_status=$1 WHERE id=$2",
    [status, id]
  );

  res.json({ success: true });
});

router.patch("/sales/:id/credito", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  await db.query(
    "UPDATE sales_history SET credito_status=$1 WHERE id=$2",
    [status, id]
  );

  res.json({ success: true });
});

// router.get("/agencies/:code/history", async (req, res) => {
//   const { code } = req.params;

//   const { rows } = await db.query(`
//     SELECT
//       reference,
//       SUM(repasse) AS repasse,
//       SUM(credito) AS credito,
//       MAX(repasse_status) AS repasse_status,
//       MAX(credito_status) AS credito_status
//     FROM sales_history
//     WHERE agency_code = $1
//     GROUP BY reference
//     ORDER BY reference DESC
//   `, [code]);

//   res.json(rows);
// });

router.get("/agencies/:code/history", async (req, res) => {
  const { code } = req.params;

  try {
    const { rows } = await db.query(`
      SELECT
        reference,
        SUM(repasse) AS repasse,
        SUM(credito) AS credito,
        BOOL_AND(pago) AS pago -- true se todos os reservation_code da reference estão pagos
      FROM sales_history
      WHERE agency_code = $1
      GROUP BY reference
      ORDER BY reference DESC
    `, [code]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar histórico do admin" });
  }
});


router.patch("/admin/report-status", async (req, res) => {
  const { agency_code, reference, status } = req.body;

  await db.query(`
    UPDATE sales_history
    SET
      repasse_status = CASE WHEN repasse > 0 THEN $3 ELSE repasse_status END,
      credito_status = CASE WHEN credito > 0 THEN $3 ELSE credito_status END
    WHERE agency_code = $1 AND reference = $2
  `, [agency_code, reference, status]);

  res.json({ success: true });
});

// Retorna todos os códigos de agências
// Retorna todos os códigos de agência
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT code
      FROM agencies
      ORDER BY code
    `);

    // 🔹 ESSENCIAL: retorna JSON, não HTML
    res.json(rows);
  } catch (err) {
    console.error("Erro ao buscar agências:", err);
    res.status(500).json({ error: "Erro ao buscar agências" });
  }
});

module.exports = router;
