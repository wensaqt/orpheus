// Chemins du frontend, pour ne pas les disperser en dur dans les composants
export const ROUTES = {
  home: '/',
  compositions: '/compositions',
  composition: (id: number | string) => `/compositions/${id}`,
  // La connexion passe pour l'instant par l'admin Payload, qui renvoie ensuite vers returnTo
  login: (returnTo: string) => `/admin/login?redirect=${encodeURIComponent(returnTo)}`,
}
