// Frontend paths, so they are not hard-coded across components
export const ROUTES = {
  home: '/',
  compositions: '/compositions',
  composition: (id: number | string) => `/compositions/${id}`,
  // Login goes through the Payload admin for now, which then redirects to returnTo
  login: (returnTo: string) => `/admin/login?redirect=${encodeURIComponent(returnTo)}`,
}
