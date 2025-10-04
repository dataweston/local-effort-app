class Queue {
  constructor(name, options) {
    this.name = name;
    this.options = options;
  }

  async add() {
    return { id: 'stub-job' };
  }

  async close() {}
}

module.exports = { Queue };
