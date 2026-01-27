import axios from 'axios';
import { LocalStorage } from '../helpers/localstorage';
// const STAGING_API_URL = "https://www.markupdesigns.net/def-dwarg/api/";
export const Image_url = 'https://www.markupdesigns.net/whitepeony/storage/';
const STAGING_API_URL = 'https://www.markupdesigns.net/whitepeony/api/';
export const API_URL = STAGING_API_URL;
let APIKit = axios.create({
  baseURL: STAGING_API_URL,
  timeout: 60000,
});

APIKit.interceptors.request.use(
  async config => {
    // Skip attaching auth if explicitly requested
    const skipAuthHeader =
      (config.headers as any)?.['X-Skip-Auth'] === 'true' ||
      (config.headers as any)?.['x-skip-auth'] === 'true';
    if (skipAuthHeader) {
      return config;
    }
    const token = await LocalStorage.read('@token');
    if (token) {
      (config.headers as any).authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    console.log('Request error:', error);
    return Promise.reject(error);
  },
);

export const UserService = {
  requestOtp: async (payload: object) => {
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    console.log('REQUEST OTP PAYLOAD:', payload);
    const res = await APIKit.post('login/request-otp', payload, apiHeaders);
    console.log('REQUEST OTP RESPONSE:', res.data);
    return res;
  },

  verifyOtp: async (payload: object) => {
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    console.log('VERIFY OTP PAYLOAD:', payload);
    const res = await APIKit.post('login/verify-otp', payload, apiHeaders);
    console.log('VERIFY OTP RESPONSE:', res.data);
    return res;
  },

  UpdateProfile: async (payload: object) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    };
    //console.log("payload", payload);
    return APIKit.post('update/profile', payload, apiHeaders);
  },

  Review: async (payload: object, id: any) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.post(`products/${id}/review`, payload, apiHeaders);
  },

  Reviewlist: async (id: any) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get(`products/${id}/reviews`, apiHeaders);
  },

  events: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get('events', apiHeaders);
  },

  nearbyevents: async (payload: any) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.post('nearbyevents', payload, apiHeaders);
  },

  GetCategoryByID: async (id: string) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get(`products/category/${id}`, apiHeaders);
  },

  bigsales: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get(`big-sales`, apiHeaders);
  },

  featuredproducts: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get(`featured-products`, apiHeaders);
  },

  Shiping: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get(`shiping`, apiHeaders);
  },

  eventsRegister: async (payload: any, id: string) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.post(`events/${id}/register`, payload, apiHeaders);
  },

  eventsListing: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get(`reigsteredevents`, apiHeaders);
  },

  eventscancel: async (id: any) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.post(`events/${id}/cancel`, apiHeaders);
  },

  order: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    //console.log("payload", token)

    return APIKit.get('order', apiHeaders);
  },

  eventupdate: async (id: any) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get(`events/${id}`, apiHeaders);
  },

  articles: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get('articles', apiHeaders);
  },

  articleDetail: async (id: string) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get(`article/${id}`, apiHeaders);
  },

  address: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get('addaddress', apiHeaders);
  },

  addaddress: async (payload: object) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.post('addaddress', payload, apiHeaders);
  },

  addressdupdate: async (id: any, payload: any) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.put(`updateaddress/${id}`, payload, apiHeaders);
  },

  OtpVerify: async (payload: object) => {
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    return APIKit.post('mobile-verify', payload, apiHeaders);
  },

  header: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get('banners', apiHeaders);
  },

  GetCategory: async () => {
    // const token = await LocalStorage.read("@token");
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get('category', apiHeaders);
  },

  product: async () => {
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Skip-Auth': 'true',
      },
    };
    return APIKit.get('products', apiHeaders);
  },

  recommended: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get('products/recommended', apiHeaders);
  },

  CatbyProduct: async (id: any) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get(`products/category/${id}`, apiHeaders);
  },

  productDetail: async id => {
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Skip-Auth': 'true',
      },
    };
    return APIKit.get(`products/${id}`, apiHeaders);
  },

  // Sorting can accept either a string (sort key) or an object of query params
  // e.g. UserService.Sorting('newest') or UserService.Sorting({ sort_by: 'newest', category_id: 12 })
  Sorting: async (params: any) => {
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Skip-Auth': 'true',
      },
    };
    return APIKit.get(`products/sort?sort_by=${params}`, apiHeaders);
  },

  // Filter products by category and filter params
  FilterProducts: async (params: any) => {
    // params: { category_id, rating, min_price, max_price }
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Skip-Auth': 'true',
      },
    };
    // Build query string
    const parts: string[] = [];
    for (const key of Object.keys(params)) {
      const val = params[key];
      if (val !== undefined && val !== null && val !== '')
        parts.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`,
        );
    }
    const query = parts.length ? `?${parts.join('&')}` : '';
    console.log('FilterProducts params:', params, query);

    return APIKit.get(`products/filter${query}`, apiHeaders);
  },

  // Filters: async (endpoint: any) => {
  //   const apiHeaders = {
  //     headers: {
  //       "Content-Type": "application/json",
  //       Accept: "application/json",
  //       "X-Skip-Auth": 'true',
  //     },
  //   };
  //   return APIKit.get(`products/filter?${endpoint}`, apiHeaders);
  // },

  mostsellingproduct: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get('mostsellingproduct', apiHeaders);
  },

  AddToCart: async (payload: object) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    //console.log("payload", payload)
    return APIKit.post('addtocart', payload, apiHeaders);
  },

  viewCart: async () => {
    const token = await LocalStorage.read('@token');
    // console.log("token", token);
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get('cart', apiHeaders);
  },

  RemoveCart: async (removeid: number) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.delete(`cart/product/${removeid}`, apiHeaders);
  },

  // ADD THIS NEW METHOD FOR REMOVING CART ITEM WITH VARIANT
  RemoveCartWithVariant: async (productId: number, variantId: number) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    // Construct the URL with product ID and variant ID query parameter
    return APIKit.delete(
      `cart/product/${productId}?variant_id=${variantId}`,
      apiHeaders,
    );
  },

  deleteaddresses: async (removeid: number) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.delete(`deleteaddresses/${removeid}`, apiHeaders);
  },

  UpdateCart: async (payload: object) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    //console.log("payload", payload, apiHeaders);
    return APIKit.post('updatecart', payload, apiHeaders);
  },

  SlugAPI: async (slug: any) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get(`pages/${slug}`, apiHeaders);
  },

  Placeorder: async (payload: object) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    // console.log("payload", payload)
    return APIKit.post('placeorder', payload, apiHeaders);
  },

  deleteAccount: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.delete(`account/delete`, apiHeaders);
  },

  notifications: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get(`notifications`, apiHeaders);
  },

  notificationsreadID: async id => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.post(`notifications/${id}/read`, apiHeaders);
  },

  notificationsunread: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get(`notifications/unread`, apiHeaders);
  },

  notificationsread: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get(`notifications/read`, apiHeaders);
  },

  deleteaccount: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.delete(`delete-account`, apiHeaders);
  },

  profile: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'multipart/form-data',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get('profile', apiHeaders);
  },

  PromoCode: async (payload: any) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.post('promo-code', payload, apiHeaders);
  },

  GetPromo_Code: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get('promocode', apiHeaders);
  },

  search: async (word: string) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    return APIKit.get(`search?q=${word}`, apiHeaders);
  },

  // Add these methods to your UserService object:

  wishlistadd: async (payload: { product_id: string | number }) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    const numericPayload = {
      product_id: Number(payload.product_id),
    };
    console.log('Wishlist add payload:', numericPayload);
    return APIKit.post(`wishlist/add`, numericPayload, apiHeaders);
  },

  // Update the wishlist function in UserService.ts
  wishlist: async () => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    console.log('Fetching wishlist from:', STAGING_API_URL + 'wishlist');

    try {
      const response = await APIKit.get('wishlist', apiHeaders);
      console.log('Wishlist API Response:', response.data);

      // Return the data part of the response
      return response.data;
    } catch (error) {
      console.error('Wishlist fetch error:', error);
      throw error;
    }
  },

  wishlistDelete: async (productId: string | number) => {
    const token = await LocalStorage.read('@token');
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };
    const numericProductId = Number(productId);
    console.log('Wishlist delete for product:', numericProductId);
    return APIKit.delete(`wishlist/product/${numericProductId}`, apiHeaders);
  },

  getProductById: async (id: string | number) => {
    const apiHeaders = {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Skip-Auth': 'true',
      },
    };
    return APIKit.get(`products/${id}`, apiHeaders);
  },
};
