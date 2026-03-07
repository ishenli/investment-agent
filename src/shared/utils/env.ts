export const isProduction = () => process.env.NODE_ENV === 'production';

export const isDevelopment = () => process.env.NODE_ENV !== 'production';

export const isTest = () => process.env.NODE_ENV === 'test';

export const isServerMode = process.env.NEXT_PUBLIC_SERVICE_MODE === 'server';