// Theme constants matching the web app (DashboardEntreprise) design
export const COLORS = {
  // Primary blues
  primary:        '#1E4D7B',
  primaryLight:   '#2563a8',
  primaryDark:    '#163a5e',
  primaryBg:      'rgba(30, 77, 123, 0.07)',
 
  // Accents
  amber:          '#D97706',
  amberLight:     '#FEF3C7',
  green:          '#16A34A',
  greenLight:     '#DCFCE7',
  purple:         '#7C3AED',
  purpleLight:    '#EDE9FE',
  cyan:           '#0891B2',
  cyanLight:      '#CFFAFE',
  red:            '#DC2626',
  redLight:       '#FEE2E2',
 
  // Neutrals
  white:          '#FFFFFF',
  bg:             '#F1F5F9',       // same as mobile container
  bgCard:         '#FFFFFF',
  border:         '#E5E7EB',
  borderLight:    '#F3F4F6',
 
  // Text
  textPrimary:    '#111827',
  textSecondary:  '#374151',
  textMuted:      '#6B7A99',
  textLight:      '#9CA3AF',
  textWhite:      '#FFFFFF',
 
  // Header
  header:         '#1E4D7B',
  headerText:     '#FFFFFF',
  headerSubtext:  '#BFDBFE',
  headerLink:     '#93C5FD',
};
 
export const FONTS = {
  mono: 'monospace',
};
 
export const RADIUS = {
  sm:   6,
  md:   10,
  lg:   12,
  xl:   16,
  full: 999,
};
 
export const SHADOW = {
  card: {
    shadowColor:   '#1E4D7B',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius:  8,
    elevation:     3,
  },
  strong: {
    shadowColor:   '#1E4D7B',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius:  12,
    elevation:     6,
  },
};
 
// Badge variants matching web STATUT_BADGE
export const BADGE = {
  warning:  { bg: '#FEF3C7', text: '#D97706' },
  info:     { bg: '#CFFAFE', text: '#0891B2' },
  success:  { bg: '#DCFCE7', text: '#16A34A' },
  error:    { bg: '#FEE2E2', text: '#DC2626' },
  purple:   { bg: '#EDE9FE', text: '#7C3AED' },
  default:  { bg: '#F3F4F6', text: '#6B7A99' },
};
 
// Statut mapping (mirrors web app)
export const STATUT_BADGE = {
  en_attente:   'warning',
  prise_charge: 'info',
  en_transit:   'info',
  livree:       'success',
  retournee:    'error',
  annulee:      'error',
};
 
export const STATUT_LABEL = {
  en_attente:   'En attente',
  prise_charge: 'Prise en charge',
  en_transit:   'En transit',
  livree:       'Livrée',
  retournee:    'Retournée',
  annulee:      'Annulée',
};
 
export const TOURNEE_STATUT_COLOR = {
  planifiee: '#D97706',
  en_cours:  '#1E4D7B',
  terminee:  '#16A34A',
  annulee:   '#6B7A99',
};
 
export const TOURNEE_STATUT_LABEL = {
  planifiee: 'Planifiée',
  en_cours:  'En cours',
  terminee:  'Terminée',
  annulee:   'Annulée',
};