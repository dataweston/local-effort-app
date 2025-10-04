class HttpException extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

class NotFoundException extends HttpException {
  constructor(message = 'Not Found') {
    super(message, 404);
  }
}

function identityDecorator() {
  return () => {};
}

module.exports = {
  HttpException,
  NotFoundException,
  Injectable: identityDecorator,
  Module: identityDecorator,
  Controller: identityDecorator,
  Get: identityDecorator,
  Post: identityDecorator,
  HttpCode: () => identityDecorator(),
  HttpStatus: { ACCEPTED: 202 },
  Param: () => () => {},
  Inject: () => () => {},
  OnModuleDestroy: identityDecorator
};
