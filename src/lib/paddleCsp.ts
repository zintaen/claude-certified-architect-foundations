/**
 * Enumerated Paddle CSP origins (PAY-002). Kept free of path aliases so
 * next.config.ts can import without Next transpile of @/ modules.
 */
export const PADDLE_CSP = {
  scriptSrc: ['https://cdn.paddle.com'],
  frameSrc: ['https://buy.paddle.com', 'https://sandbox-buy.paddle.com'],
  connectSrc: [
    'https://api.paddle.com',
    'https://sandbox-api.paddle.com',
    'https://cdn.paddle.com',
  ],
  imgSrc: ['https://cdn.paddle.com'],
} as const;
