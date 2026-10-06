'use strict';

const COMMERCE_STORES = Object.freeze(require('../../../shared/commerce-stores.json'));

module.exports = { COMMERCE_STORES, COMMERCE_STORE_KEYS: Object.freeze(Object.keys(COMMERCE_STORES)) };
