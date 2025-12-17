import businessRaw from '../../public/business.json?raw';
import thumbtackRaw from '../../public/reviews/thumbtack.json?raw';

const safeParse = (jsonString, fallback) => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
};

export const businessInfo = safeParse(businessRaw, {});
export const thumbtackReviews = safeParse(thumbtackRaw, []);
