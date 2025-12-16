/**
 * API Key middleware - for external services (e.g., RFID readers)
 */
export const requireApiKey = (req, res, next) => {
  const key = req.query.key || req.headers["x-api-key"];

  if (!key) {
    return res.status(401).json({ message: "API key required" });
  }

  if (key !== process.env.SESSION_API_KEY) {
    return res.status(403).json({ message: "Forbidden. Invalid API key." });
  }

  next();
};
