module.exports = ({ env }) => ({
  defaultConnection: "default",
  connections: {
    default: {
      connector: "mongoose",
      settings: {
        host: env("DATABASE_HOST", "ds259001.mlab.com"),
        srv: env.bool("DATABASE_SRV", false),
        port: env.int("DATABASE_PORT", 59001),
        database: env("DATABASE_NAME", "adl-lrs"),
        username: env("DATABASE_USERNAME", "root"),
        password: env("DATABASE_PASSWORD", "o0i9u8y7"),
      },
      options: {
        authenticationDatabase: env("AUTHENTICATION_DATABASE", "adl-lrs"),
        ssl: env.bool("DATABASE_SSL", false),
      },
    },
  },
});
