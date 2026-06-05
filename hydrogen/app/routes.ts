import { hydrogenRoutes } from '@shopify/hydrogen';
import { route, index, type RouteConfig } from '@react-router/dev/routes';

export default hydrogenRoutes([
  index('routes/_index.tsx'),
  route('cart', 'routes/cart.tsx'),
  route('search', 'routes/search.tsx'),
  route('collections/:handle', 'routes/collections.$handle.tsx'),
  route('products/:handle', 'routes/products.$handle.tsx'),
  route('api/reviews/:handle', 'routes/api.reviews.$handle.tsx'),
  route('api/selling-plans/:handle', 'routes/api.selling-plans.$handle.tsx'),
  route('api/globo-options/:productId', 'routes/api.globo-options.$productId.tsx'),
  route('pages/contact-us', 'routes/pages.contact.tsx'),
  route('pages/faqs', 'routes/pages.faqs.tsx'),
  route('pages/:handle', 'routes/pages.$handle.tsx'),
  route('account', 'routes/account.tsx', [
    index('routes/account._index.tsx'),
    route('authorize', 'routes/account_.authorize.tsx'),
    route('logout', 'routes/account_.logout.tsx'),
  ]),
]) satisfies RouteConfig;
