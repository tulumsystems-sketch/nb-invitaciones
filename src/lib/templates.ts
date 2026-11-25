export type TemplateKey =
  | 'clasico-elegante'
  | 'minimalista-moderno'
  | 'floral-romantico'
  | 'colorido-divertido'
  | 'oscuro-dorado';

export type FontPreset = 'serif' | 'sans' | 'mono';

export interface InvitationStyleConfig {
  template_key: TemplateKey;
  primary_color: string;
  font_preset: FontPreset;
  sections: {
    hero: boolean;
    details: boolean;
    location: boolean;
    extras: boolean;
    rsvp: boolean;
  };
}

export interface TemplateMeta {
  key: TemplateKey;
  name: string;
  badge: string;
  description: string;
  readyInPilot: boolean;
  defaultPrimaryColor: string;
  defaultFont: FontPreset;
  fieldsSchema: {
    key: string;
    type: 'text' | 'textarea' | 'datetime' | 'url' | 'phone' | 'color' | 'image';
  }[];
}

export const TEMPLATES: TemplateMeta[] = [
  {
    key: 'clasico-elegante',
    name: '1. Clásico elegante',
    badge: 'Listo para demo',
    description: 'Marco editorial sereno, tipografía clásica y jerarquía formal para ceremonias y celebraciones.',
    readyInPilot: true,
    defaultPrimaryColor: '#292524',
    defaultFont: 'serif',
    fieldsSchema: [
      { key: 'title', type: 'text' },
      { key: 'welcome_phrase', type: 'textarea' },
      { key: 'event_date', type: 'datetime' },
      { key: 'venue_name', type: 'text' },
      { key: 'venue_maps_url', type: 'url' },
    ],
  },
  {
    key: 'minimalista-moderno',
    name: '2. Minimalista moderno',
    badge: 'Listo para demo',
    description: 'Líneas limpias, mucho aire visual y foco directo en fecha, lugar y confirmación.',
    readyInPilot: true,
    defaultPrimaryColor: '#0f172a',
    defaultFont: 'sans',
    fieldsSchema: [
      { key: 'title', type: 'text' },
      { key: 'welcome_phrase', type: 'textarea' },
      { key: 'event_date', type: 'datetime' },
      { key: 'venue_name', type: 'text' },
      { key: 'venue_maps_url', type: 'url' },
    ],
  },
  {
    key: 'floral-romantico',
    name: '3. Floral romántico',
    badge: 'Sprint final',
    description: 'Estética suave y romántica con detalles botánicos para bodas y aniversarios.',
    readyInPilot: false,
    defaultPrimaryColor: '#881337',
    defaultFont: 'serif',
    fieldsSchema: [{ key: 'title', type: 'text' }],
  },
  {
    key: 'colorido-divertido',
    name: '4. Colorido y divertido',
    badge: 'Sprint final',
    description: 'Paleta vibrante y amigable pensada para cumpleaños, baby shower y bautismos.',
    readyInPilot: false,
    defaultPrimaryColor: '#0369a1',
    defaultFont: 'sans',
    fieldsSchema: [{ key: 'title', type: 'text' }],
  },
  {
    key: 'oscuro-dorado',
    name: '5. Oscuro y dorado premium',
    badge: 'Sprint final',
    description: 'Fondo profundo con acentos cálidos y contraste alto para eventos nocturnos.',
    readyInPilot: false,
    defaultPrimaryColor: '#b45309',
    defaultFont: 'serif',
    fieldsSchema: [{ key: 'title', type: 'text' }],
  },
];