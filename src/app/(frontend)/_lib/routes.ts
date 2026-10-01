// Query parameter carrying the page to come back to after signing in
export const RETURN_TO_PARAM = 'redirect'

const withReturnTo = (path: string, returnTo: string) =>
  `${path}?${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`

// Sign-in and sign-up pages
export const AUTH_PAGES = { login: '/login', signup: '/signup' }

// Frontend paths, so they are not hard-coded across components
export const ROUTES = {
  home: '/',
  compositions: '/compositions',
  composition: (id: number | string) => `/compositions/${id}`,
  // The app's own sign-in and sign-up pages, which then send the user back to returnTo
  login: (returnTo: string) => withReturnTo(AUTH_PAGES.login, returnTo),
  signup: (returnTo: string) => withReturnTo(AUTH_PAGES.signup, returnTo),
}
