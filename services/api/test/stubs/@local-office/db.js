class PrismaClient {
  async $connect() {}
  async $disconnect() {}
}

module.exports = {
  PrismaClient,
  prisma: new PrismaClient()
};
