export default () => ({
  api: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
  database: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_DATABASE_NAME,
    port: parseInt(process.env.DB_PORT || '5432', 10)
  }
});
