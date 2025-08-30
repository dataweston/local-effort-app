// Minimal root-level ping for Vercel serverless health checks
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ ok: true, now: new Date().toISOString() });
};
