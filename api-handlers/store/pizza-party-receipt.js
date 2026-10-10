// Retired: Pizza Party confirmations are created from the server-side checkout.
// Keep this route inert so old clients cannot trigger a duplicate receipt.
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  return res.status(410).json({ error: 'Receipt is sent by checkout; this endpoint is retired.' });
};
