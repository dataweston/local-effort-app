const API_BASE_URL = 'https://local-effort-app-lniu.vercel.app/api/crowdfund';

export const fetchStatus = async () => {
  const response = await fetch(`${API_BASE_URL}/status`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export const createCheckoutSession = async (cart, cartTotal) => {
  const response = await fetch(`${API_BASE_URL}/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: cart, totalAmount: cartTotal }),
  });

  const result = await response.json();
  if (!response.ok || !result.url) {
    throw new Error(result.error || 'Failed to initiate payment.');
  }
  return result;
};