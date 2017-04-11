import GraphQLJSClient from './graphql-client';
import types from '../types';
import productQuery from './product-query';
import productConnectionQuery from './product-connection-query';
import collectionQuery from './collection-query';
import collectionConnectionQuery from './collection-connection-query';
import checkoutQuery from './checkout-query';
import customAttributeQuery from './custom-attribute-query';
import imageConnectionQuery from './image-connection-query';
import imageQuery from './image-query';
import lineItemConnectionQuery from './line-item-connection-query';
import mailingAddressQuery from './mailing-address-query';
import optionQuery from './option-query';
import orderQuery from './order-query';
import selectedOptionQuery from './selected-option-query';
import shippingRateQuery from './shipping-rate-query';
import variantConnectionQuery from './variant-connection-query';
import variantQuery from './variant-query';
import shopQuery from './shop-query';
import domainQuery from './domain-query';
import shopPolicyQuery from './shop-policy-query';
import ProductHelpers from './product-helpers';
import ImageHelpers from './image-helpers';

export {default as Config} from './config';

const shopPolicies = [
  ['privacyPolicy', shopPolicyQuery()],
  ['termsOfService', shopPolicyQuery()],
  ['refundPolicy', shopPolicyQuery()]
];

/**
 * @class Client
 */
export default class Client {
  constructor(config, GraphQLClientClass = GraphQLJSClient) {
    const apiUrl = `https://${config.domain}/api/graphql`;

    this.graphQLClient = new GraphQLClientClass(types, {
      url: apiUrl,
      fetcherOptions: {
        headers: {
          'X-Shopify-Storefront-Access-Token': config.storefrontAccessToken
        }
      }
    });

    this.Product = {};
    this.Product.Helpers = new ProductHelpers();

    this.Image = {};
    this.Image.Helpers = new ImageHelpers();

    this.Queries = {
      productQuery,
      productConnectionQuery,
      collectionQuery,
      collectionConnectionQuery,
      checkoutQuery,
      customAttributeQuery,
      imageConnectionQuery,
      imageQuery,
      lineItemConnectionQuery,
      mailingAddressQuery,
      optionQuery,
      orderQuery,
      selectedOptionQuery,
      shippingRateQuery,
      variantConnectionQuery,
      variantQuery,
      shopQuery,
      domainQuery,
      shopPolicyQuery
    };
  }

  fetchShopInfo(query = shopQuery()) {
    const rootQuery = this.graphQLClient.query((root) => {
      query(root, 'shop');
    });

    return this.graphQLClient.send(rootQuery).then((result) => {
      return result.model.shop;
    });
  }

  fetchShopPolicies(query = shopQuery(shopPolicies)) {
    const rootQuery = this.graphQLClient.query((root) => {
      query(root, 'shop');
    });

    return this.graphQLClient.send(rootQuery).then((result) => {
      return result.model.shop;
    });
  }

  fetchAllProducts(query = productConnectionQuery()) {
    const rootQuery = this.graphQLClient.query((root) => {
      root.add('shop', (shop) => {
        query(shop, 'products');
      });
    });

    return this.graphQLClient.send(rootQuery).then(({model}) => {
      const promises = model.shop.products.reduce((promiseAcc, product) => {
        // Fetch the rest of the images and variants for this product
        promiseAcc.push(this.graphQLClient.fetchAllPages(product.images, {pageSize: 250}).then((images) => {
          product.attrs.images = images;
        }));

        promiseAcc.push(this.graphQLClient.fetchAllPages(product.variants, {pageSize: 250}).then((variants) => {
          product.attrs.variants = variants;
        }));

        return promiseAcc;
      }, []);

      return Promise.all(promises).then(() => {
        return model.shop.products;
      });
    });
  }

  fetchProduct(id, query = productQuery()) {
    const rootQuery = this.graphQLClient.query((root) => {
      query(root, 'node', id);
    });

    return this.graphQLClient.send(rootQuery).then(({model}) => {
      const promises = [];

      promises.push(this.graphQLClient.fetchAllPages(model.node.images, {pageSize: 250}).then((images) => {
        model.node.attrs.images = images;
      }));

      promises.push(this.graphQLClient.fetchAllPages(model.node.variants, {pageSize: 250}).then((variants) => {
        model.node.attrs.variants = variants;
      }));

      return Promise.all(promises).then(() => {
        return model.node;
      });
    });
  }

  fetchAllCollections(query = collectionConnectionQuery()) {
    const rootQuery = this.graphQLClient.query((root) => {
      root.add('shop', (shop) => {
        query(shop, 'collections');
      });
    });

    return this.graphQLClient.send(rootQuery).then((response) => {
      return response.model.shop.collections;
    });
  }

  fetchCollection(id, query = collectionQuery()) {
    const rootQuery = this.graphQLClient.query((root) => {
      query(root, 'node', id);
    });

    return this.graphQLClient.send(rootQuery).then((response) => {
      return response.model.node;
    });
  }

  fetchQueryProducts(queryObject = {}, query = productConnectionQuery()) {
    const queryArgStrings = [];
    const options = {};

    if (queryObject.title) {
      queryArgStrings.push(`title:'${queryObject.title}'`);
    }
    if (queryObject.updatedAtMin) {
      queryArgStrings.push(`updated_at:>='${queryObject.updatedAtMin}'`);
    }
    if (queryObject.createdAtMin) {
      queryArgStrings.push(`created_at:>='${queryObject.createdAtMin}'`);
    }
    if (queryObject.productType) {
      queryArgStrings.push(`product_type:'${queryObject.productType}'`);
    }
    if (queryObject.limit) {
      options.first = queryObject.limit;
    }
    if (queryObject.sortBy) {
      let sortKey;

      switch (queryObject.sortBy) {
        case 'title':
          sortKey = this.graphQLClient.enum('TITLE');
          break;
        case 'updatedAt':
          sortKey = this.graphQLClient.enum('UPDATED_AT');
          break;
        case 'createdAt':
          sortKey = this.graphQLClient.enum('CREATED_AT');
          break;
      }

      options.sortKey = sortKey;
    }
    if (queryObject.sortDirection === 'desc') {
      options.reverse = true;
    }

    options.query = queryArgStrings.join(' ');

    const rootQuery = this.graphQLClient.query((root) => {
      root.add('shop', (shop) => {
        query(shop, 'products', options);
      });
    });

    return this.graphQLClient.send(rootQuery).then(({model}) => {
      const promises = model.shop.products.reduce((promiseAcc, product) => {
        // Fetch the rest of the images and variants for this product
        promiseAcc.push(this.graphQLClient.fetchAllPages(product.images, {pageSize: 250}).then((images) => {
          product.attrs.images = images;
        }));

        promiseAcc.push(this.graphQLClient.fetchAllPages(product.variants, {pageSize: 250}).then((variants) => {
          product.attrs.variants = variants;
        }));

        return promiseAcc;
      }, []);

      return Promise.all(promises).then(() => {
        return model.shop.products;
      });
    });
  }

  fetchQueryCollections(queryObject = {}, query = collectionConnectionQuery()) {
    const queryArgStrings = [];
    const options = {};

    if (queryObject.title) {
      queryArgStrings.push(`title:'${queryObject.title}'`);
    }
    if (queryObject.updatedAtMin) {
      queryArgStrings.push(`updated_at:>='${queryObject.updatedAtMin}'`);
    }
    if (queryObject.limit) {
      options.first = queryObject.limit;
    }
    if (queryObject.sortBy) {
      let sortKey;

      switch (queryObject.sortBy) {
        case 'title':
          sortKey = this.graphQLClient.enum('TITLE');
          break;
        case 'updatedAt':
          sortKey = this.graphQLClient.enum('UPDATED_AT');
          break;
      }

      options.sortKey = sortKey;
    }
    if (queryObject.sortDirection === 'desc') {
      options.reverse = true;
    }

    options.query = queryArgStrings.join(' ');

    const rootQuery = this.graphQLClient.query((root) => {
      root.add('shop', (shop) => {
        query(shop, 'collections', options);
      });
    });

    return this.graphQLClient.send(rootQuery).then((response) => {
      return response.model.shop.collections;
    });
  }

  /**
   * Creates a checkout.
   *
   * ```javascript
   * client.createCheckout({lineItems:[ ... ]}).then(checkout => {
   *   // do something with the checkout
   * });
   * ```
   *
   * @method createCheckout
   * @public
   * @param {Object} [input] An input object containing zero or more of:
   *   @param {String} [input.email] An email connected to the checkout
   *   @param {Array} [input.lineItems] A list of line items in the checkout
   *   @param {Object} [input.shippingAddress] A shipping address
   *   @param {String} [input.note] A note for the checkout
   *   @param {Array} [input.customAttributes] A list of custom attributes
   * @param {Function} [query] Callback function to specify fields to query on the checkout returned
   * @return {Promise|GraphModel} A promise resolving with the created checkout.
   */
  createCheckout(input = {}, query = checkoutQuery()) {
    const mutation = this.graphQLClient.mutation((root) => {
      root.add('checkoutCreate', {args: {input}}, (checkoutCreate) => {
        checkoutCreate.add('userErrors', (userErrors) => {
          userErrors.add('message');
          userErrors.add('field');
        });
        query(checkoutCreate, 'checkout');
      });
    });

    return this.graphQLClient.send(mutation).then((result) => {
      const userErrors = result.data.checkoutCreate.userErrors;

      if (userErrors.length) {
        return Promise.reject(new Error(JSON.stringify(userErrors)));
      }

      return this.graphQLClient.fetchAllPages(result.model.checkoutCreate.checkout.lineItems, {pageSize: 250}).then((lineItems) => {
        result.model.checkoutCreate.checkout.attrs.lineItems = lineItems;

        return result.model.checkoutCreate.checkout;
      });
    });
  }

  /**
   * Adds line items to an existing checkout.
   *
   * ```javascript
   * client.addLineItems({checkoutId: ..., lineItems:[ ... ]}).then(checkout => {
   *   // do something with the updated checkout
   * });
   * ```
   *
   * @method addLineItems
   * @public
   * @param {Object} input An input object containing:
   *   @param {String} input.checkoutId The ID of the checkout to add line items to
   *   @param {Array} [input.lineItems] A list of line items to add to the checkout
   * @param {Function} [query] Callback function to specify fields to query on the checkout returned
   * @return {Promise|GraphModel} A promise resolving with the created checkout.
   */
  addLineItems(input, query = checkoutQuery()) {
    const mutation = this.graphQLClient.mutation((root) => {
      root.add('checkoutLineItemsAdd', {args: {input}}, (checkoutLineItemsAdd) => {
        checkoutLineItemsAdd.add('userErrors', (userErrors) => {
          userErrors.add('message');
          userErrors.add('field');
        });
        query(checkoutLineItemsAdd, 'checkout');
      });
    });

    return this.graphQLClient.send(mutation).then((result) => {
      const userErrors = result.data.checkoutLineItemsAdd.userErrors;

      if (userErrors.length) {
        return Promise.reject(new Error(JSON.stringify(userErrors)));
      }

      return this.graphQLClient.fetchAllPages(result.model.checkoutLineItemsAdd.checkout.lineItems, {pageSize: 250}).then((lineItems) => {
        result.model.checkoutLineItemsAdd.checkout.attrs.lineItems = lineItems;

        return result.model.checkoutLineItemsAdd.checkout;
      });
    });
  }
}