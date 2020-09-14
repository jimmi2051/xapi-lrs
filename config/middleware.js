module.exports = {
  load: {
    before: ["responseTime", "logger", "cors", "responses", "gzip"],
    order: ["parser", "parseRequest"],
    after: ["router"],
  },
  settings: {
    cors: {
      origin: [
        "http://localhost:5500",
        "https://mysite.com",
        "https://www.mysite.com",
        "http://127.0.0.1:5500",
        "*",
      ],
      headers: [
        "Content-Type",
        "Authorization",
        "X-Frame-Options",
        "x-experience-api-version",
      ],
    },
  },
  settings: {
    parseRequest: {
      enabled: true,
    },
  },
};
