const express = require("express");
const db = require("../db");

const router = express.Router();

/* Buscar agência */
router.get("/:code", async (req, res) => {
  const { code } = req.params;

  const agency = await db.query(
    "SELECT * FROM agencies WHERE code = $1",
    [code]
  );

  if (!agency.rows.length) {
    return res.status(404).json({ error: "Agência não encontrada" });
  }

  const balance = await db.query(
    `
    SELECT 
      COALESCE(SUM(repasse),0) AS repasse,
      COALESCE(SUM(credito),0) AS credito
    FROM sales_history
    WHERE agency_code = $1
    `,
    [code]
  );

  res.json({
    ...agency.rows[0],
    balance: balance.rows[0]
  });
});

router.get("/admin/agencies", async (req, res) => {
  const { rows } = await db.query(
    "SELECT code FROM agencies ORDER BY code"
  );
  res.json(rows);
});

/* Histórico */
// router.get("/:code/history", async (req, res) => {
//   const { code } = req.params;

//   const history = await db.query(
//     `
//     SELECT reference, repasse, credito, created_at
//     FROM sales_history
//     WHERE agency_code = $1
//     ORDER BY created_at DESC
//     `,
//     [code]
//   );

//   res.json(history.rows);
// });

router.get("/:code/history", async (req, res) => {
  const { code } = req.params;

  try {
    const { rows } = await db.query(
      `
      SELECT reference, repasse, credito, reservation_code, pago, created_at
      FROM sales_history
      WHERE agency_code = $1
      ORDER BY reference DESC, reservation_code
      `,
      [code]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar histórico" });
  }
});


// router.get("/agencies/:code/history", async (req, res) => {
//   const { code } = req.params;

//   const { rows } = await db.query(`
//     SELECT
//       id,
//       reservation,
//       reference,
//       repasse,
//       credito,
//       repasse_status,
//       credito_status,
//       created_at
//     FROM sales_history
//     WHERE agency_code = $1
//     ORDER BY reference DESC, reservation
//   `, [code]);

//   res.json(rows);
// });

module.exports = router;
