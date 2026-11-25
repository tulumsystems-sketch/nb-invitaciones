import React, { useEffect, useRef, useState } from 'react';
import { TEMPLATES, type FontPreset, type InvitationStyleConfig, type TemplateKey } from '../../lib/templates';
import { validateAndCompressImage } from '../../lib/image-compression';
import InvitationPreview, {
  extractYouTubeId,
  type InvitationMusicConfig,
  type InvitationPhotos,
} from './InvitationPreview';

type EventType = 'casamiento' | 'quince' | 'cumple' | 'baby_shower' | 'bautismo' | 'otro';

interface MusicTrackOption {
  id: string;
  title: string;
  artist: string | null;
  file_url: string;
  mood: string | null;
}

export interface InitialDraftPayload {
  id: string;
  slug: string;
  status: string;
  event_type: string | null;
  event_type_other: string | null;
  wizard_step: number | null;
  data: Record<string, unknown> | null;
  style: Record<string, unknown> | null;
}

interface WizardData {
  event_type: EventType;
  event_type_other: string;
  title: string;
  event_date: string;
  welcome_phrase: string;
  venue_name: string;
  venue_address: string;
  venue_maps_url: string;
  ceremony_name: string;
  ceremony_address: string;
  ceremony_maps_url: string;
  parents_or_hosts: string;
  godparents: string;
  age: string;
  baby_name: string;
  host_whatsapp: string;
  sheet_email: string;
  rsvp_deadline: string;
  gift_alias: string;
  dress_code: string;
  enable_countdown: boolean;
  schedule_text: string;
  lodging_text: string;
  hashtag: string;
  photos: InvitationPhotos;
  music: InvitationMusicConfig;
}

interface Props {
  initialHasSession: boolean;
  isAnonymous: boolean;
  turnstileSiteKey?: string;
  initialDraft?: InitialDraftPayload | null;
}

const STEPS = [
  '1. Evento',
  '2. Principal',
  '3. Lugar',
  '4. Protagonistas',
  '5. Fotos',
  '6. Música',
  '7. Confirmación',
  '8. Extras',
  '9. Estilo',
];

const EVENT_TYPES: { id: EventType; label: string; desc: string }[] = [
  { id: 'casamiento', label: 'Casamiento', desc: 'Ceremonia, fiesta, padrinos y regalos' },
  { id: 'quince', label: '15 Años', desc: 'Fiesta, padres, padrinos y dress code' },
  { id: 'cumple', label: 'Cumpleaños', desc: 'Festejo, edad y ubicación' },
  { id: 'baby_shower', label: 'Baby Shower', desc: 'Nombre del bebé, papás y lista' },
  { id: 'bautismo', label: 'Bautismo', desc: 'Ceremonia, padrinos y recepción' },
  { id: 'otro', label: 'Otro evento', desc: 'Aniversario, recepción o evento privado' },
];

const DEFAULT_FORM: WizardData = {
  event_type: 'casamiento',
  event_type_other: '',
  title: '',
  event_date: '',
  welcome_phrase: 'Nos encantaría compartir este momento tan especial con vos.',
  venue_name: '',
  venue_address: '',
  venue_maps_url: '',
  ceremony_name: '',
  ceremony_address: '',
  ceremony_maps_url: '',
  parents_or_hosts: '',
  godparents: '',
  age: '',
  baby_name: '',
  host_whatsapp: '',
  sheet_email: '',
  rsvp_deadline: '',
  gift_alias: '',
  dress_code: 'Elegante',
  enable_countdown: true,
  schedule_text: '',
  lodging_text: '',
  hashtag: '',
  photos: {
    cover: null,
    gallery: [],
    closing: null,
  },
  music: {
    mode: 'none',
    trackId: null,
    trackTitle: '',
    trackUrl: '',
    youtubeUrl: '',
  },
};

const DEFAULT_STYLE: InvitationStyleConfig = {
  template_key: 'clasico-elegante',
  primary_color: '#292524',
  font_preset: 'serif',
  sections: {
    hero: true,
    details: true,
    location: true,
    extras: true,
    rsvp: true,
  },
};

function hydrateFormFromDraft(draft?: InitialDraftPayload | null): WizardData {
  if (!draft) return DEFAULT_FORM;
  const raw = draft.data && typeof draft.data === 'object' ? draft.data : {};
  const rawPhotos =
    raw.photos && typeof raw.photos === 'object'
      ? (raw.photos as Partial<InvitationPhotos>)
      : {};
  const rawMusic =
    raw.music && typeof raw.music === 'object'
      ? (raw.music as Partial<InvitationMusicConfig>)
      : {};

  const validEventTypes: EventType[] = [
    'casamiento',
    'quince',
    'cumple',
    'baby_shower',
    'bautismo',
    'otro',
  ];
  const candidateType =
    (typeof raw.event_type === 'string' ? raw.event_type : draft.event_type) || 'casamiento';
  const resolvedEventType: EventType = validEventTypes.includes(candidateType as EventType)
    ? (candidateType as EventType)
    : 'casamiento';

  return {
    ...DEFAULT_FORM,
    event_type: resolvedEventType,
    event_type_other:
      typeof raw.event_type_other === 'string'
        ? raw.event_type_other
        : draft.event_type_other || '',
    title: typeof raw.title === 'string' ? raw.title : '',
    event_date: typeof raw.event_date === 'string' ? raw.event_date : '',
    welcome_phrase:
      typeof raw.welcome_phrase === 'string'
        ? raw.welcome_phrase
        : DEFAULT_FORM.welcome_phrase,
    venue_name: typeof raw.venue_name === 'string' ? raw.venue_name : '',
    venue_address: typeof raw.venue_address === 'string' ? raw.venue_address : '',
    venue_maps_url: typeof raw.venue_maps_url === 'string' ? raw.venue_maps_url : '',
    ceremony_name: typeof raw.ceremony_name === 'string' ? raw.ceremony_name : '',
    ceremony_address: typeof raw.ceremony_address === 'string' ? raw.ceremony_address : '',
    ceremony_maps_url: typeof raw.ceremony_maps_url === 'string' ? raw.ceremony_maps_url : '',
    parents_or_hosts:
      typeof raw.parents_or_hosts === 'string' ? raw.parents_or_hosts : '',
    godparents: typeof raw.godparents === 'string' ? raw.godparents : '',
    age: typeof raw.age === 'string' ? raw.age : raw.age ? String(raw.age) : '',
    baby_name: typeof raw.baby_name === 'string' ? raw.baby_name : '',
    host_whatsapp: typeof raw.host_whatsapp === 'string' ? raw.host_whatsapp : '',
    sheet_email: typeof raw.sheet_email === 'string' ? raw.sheet_email : '',
    rsvp_deadline: typeof raw.rsvp_deadline === 'string' ? raw.rsvp_deadline : '',
    gift_alias: typeof raw.gift_alias === 'string' ? raw.gift_alias : '',
    dress_code: typeof raw.dress_code === 'string' ? raw.dress_code : DEFAULT_FORM.dress_code,
    enable_countdown:
      typeof raw.enable_countdown === 'boolean' ? raw.enable_countdown : true,
    schedule_text: typeof raw.schedule_text === 'string' ? raw.schedule_text : '',
    lodging_text: typeof raw.lodging_text === 'string' ? raw.lodging_text : '',
    hashtag: typeof raw.hashtag === 'string' ? raw.hashtag : '',
    photos: {
      cover: typeof rawPhotos.cover === 'string' ? rawPhotos.cover : null,
      gallery: Array.isArray(rawPhotos.gallery) ? rawPhotos.gallery : [],
      closing: typeof rawPhotos.closing === 'string' ? rawPhotos.closing : null,
    },
    music: {
      mode:
        rawMusic.mode === 'library' || rawMusic.mode === 'youtube' || rawMusic.mode === 'none'
          ? rawMusic.mode
          : 'none',
      trackId: typeof rawMusic.trackId === 'string' ? rawMusic.trackId : null,
      trackTitle: typeof rawMusic.trackTitle === 'string' ? rawMusic.trackTitle : '',
      trackUrl: typeof rawMusic.trackUrl === 'string' ? rawMusic.trackUrl : '',
      youtubeUrl: typeof rawMusic.youtubeUrl === 'string' ? rawMusic.youtubeUrl : '',
    },
  };
}

function hydrateStyleFromDraft(draft?: InitialDraftPayload | null): InvitationStyleConfig {
  if (!draft || !draft.style || typeof draft.style !== 'object') {
    return DEFAULT_STYLE;
  }
  const s = draft.style as Partial<InvitationStyleConfig>;
  const validTemplates: TemplateKey[] = [
    'clasico-elegante',
    'minimalista-moderno',
    'floral-romantico',
    'colorido-divertido',
    'oscuro-dorado',
  ];
  const tplKey: TemplateKey =
    s.template_key && validTemplates.includes(s.template_key as TemplateKey)
      ? (s.template_key as TemplateKey)
      : 'clasico-elegante';

  const fontPreset: FontPreset =
    s.font_preset === 'serif' || s.font_preset === 'sans' || s.font_preset === 'mono'
      ? s.font_preset
      : 'serif';

  return {
    template_key: tplKey,
    primary_color:
      typeof s.primary_color === 'string' && s.primary_color
        ? s.primary_color
        : DEFAULT_STYLE.primary_color,
    font_preset: fontPreset,
    sections: {
      hero: typeof s.sections?.hero === 'boolean' ? s.sections.hero : true,
      details: typeof s.sections?.details === 'boolean' ? s.sections.details : true,
      location: typeof s.sections?.location === 'boolean' ? s.sections.location : true,
      extras: typeof s.sections?.extras === 'boolean' ? s.sections.extras : true,
      rsvp: typeof s.sections?.rsvp === 'boolean' ? s.sections.rsvp : true,
    },
  };
}

export default function EventWizard({
  initialHasSession,
  isAnonymous,
  initialDraft = null,
}: Props) {
  const initialStep =
    typeof initialDraft?.wizard_step === 'number' &&
    initialDraft.wizard_step >= 1 &&
    initialDraft.wizard_step <= 9
      ? initialDraft.wizard_step
      : 1;

  const [step, setStep] = useState<number>(initialStep);
  const [sessionReady, setSessionReady] = useState<boolean>(initialHasSession);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [draftId, setDraftId] = useState<string | null>(initialDraft?.id ?? null);
  const [draftSlug, setDraftSlug] = useState<string | null>(initialDraft?.slug ?? null);
  const [savingDraft, setSavingDraft] = useState<boolean>(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(
    initialDraft ? `Editando borrador existente (${initialDraft.slug})` : null
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const [tracks, setTracks] = useState<MusicTrackOption[]>([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [form, setForm] = useState<WizardData>(() => hydrateFormFromDraft(initialDraft));
  const [styleConfig, setStyleConfig] = useState<InvitationStyleConfig>(() =>
    hydrateStyleFromDraft(initialDraft)
  );

  useEffect(() => {
    if (sessionReady) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/anon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!cancelled) {
          if (res.ok && data.ok) {
            setSessionReady(true);
          } else {
            setSessionError(data.error || 'No se pudo iniciar la sesión de invitado.');
          }
        }
      } catch {
        if (!cancelled) {
          setSessionError('Error de conexión al iniciar sesión de invitado.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionReady]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/music');
        const json = await res.json();
        if (active && res.ok && Array.isArray(json.tracks)) {
          setTracks(json.tracks);
        }
      } catch {
        // Silencioso
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const updateField = <K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectTemplate = (key: TemplateKey) => {
    const meta = TEMPLATES.find((t) => t.key === key);
    if (!meta || !meta.readyInPilot) return;
    setStyleConfig((prev) => ({
      ...prev,
      template_key: key,
      primary_color: meta.defaultPrimaryColor,
      font_preset: meta.defaultFont,
    }));
  };

  const toggleSection = (sec: keyof InvitationStyleConfig['sections']) => {
    setStyleConfig((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sec]: !prev.sections[sec],
      },
    }));
  };

  const handleSaveDraft = async (
    targetStep: number = step,
    overridePhotos?: InvitationPhotos
  ): Promise<string | null> => {
    setSavingDraft(true);
    setSaveError(null);
    setSaveMessage(null);

    const payloadData = {
      ...form,
      photos: overridePhotos ?? form.photos,
    };

    try {
      const res = await fetch('/api/invitations/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          event_type: form.event_type,
          event_type_other: form.event_type_other,
          wizard_step: targetStep,
          data: payloadData,
          style: styleConfig,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        setSaveError(result.error || 'No se pudo guardar el borrador.');
        return null;
      }
      setDraftId(result.draftId);
      setDraftSlug(result.slug);
      setSaveMessage(`Cambios guardados en (${result.slug})`);
      return result.draftId as string;
    } catch {
      setSaveError('Error de red al guardar el borrador.');
      return null;
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePhotoUpload = async (
    slot: 'cover' | 'gallery' | 'closing',
    rawFile: File | undefined
  ) => {
    if (!rawFile) return;
    setSaveError(null);
    setSaveMessage(null);
    setUploadingPhoto(true);

    try {
      const activeDraftId = draftId ?? (await handleSaveDraft(step));
      if (!activeDraftId) {
        setUploadingPhoto(false);
        return;
      }

      const compressed = await validateAndCompressImage(rawFile);
      const body = new FormData();
      body.append('draftId', activeDraftId);
      body.append('slot', slot);
      body.append('file', compressed.file);

      const res = await fetch('/api/invitations/upload', {
        method: 'POST',
        body,
      });
      const result = await res.json();

      if (!res.ok || !result.ok) {
        setSaveError(result.error || 'No se pudo subir la imagen.');
        return;
      }

      setForm((prev) => ({
        ...prev,
        photos: result.photos,
      }));
      setSaveMessage(
        `Foto subida (${compressed.originalSizeMb} MB → ${compressed.compressedSizeMb} MB)`
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al procesar la imagen.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeGalleryPhoto = (indexToRemove: number) => {
    setForm((prev) => ({
      ...prev,
      photos: {
        ...prev.photos,
        gallery: prev.photos.gallery.filter((_, idx) => idx !== indexToRemove),
      },
    }));
  };

  const removeSlotPhoto = (slot: 'cover' | 'closing') => {
    setForm((prev) => ({
      ...prev,
      photos: {
        ...prev.photos,
        [slot]: null,
      },
    }));
  };

  const handleTogglePreviewTrack = (track: MusicTrackOption) => {
    if (!track.file_url) {
      setPlayingTrackId((prev) => (prev === track.id ? null : track.id));
      return;
    }
    if (playingTrackId === track.id) {
      audioRef.current?.pause();
      setPlayingTrackId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.src = track.file_url;
      audioRef.current.play().catch(() => {});
    }
    setPlayingTrackId(track.id);
  };

  const handleSelectLibraryTrack = (track: MusicTrackOption) => {
    updateField('music', {
      mode: 'library',
      trackId: track.id,
      trackTitle: track.title,
      trackUrl: track.file_url,
      youtubeUrl: '',
    });
  };

  const handleNext = async () => {
    const nextStep = Math.min(9, step + 1);
    await handleSaveDraft(nextStep);
    setStep(nextStep);
  };

  const handleSaveAndRegister = async () => {
    const savedId = await handleSaveDraft(step);
    if (!savedId) return;
    window.location.href = '/registro?next=/mis-invitaciones';
  };

  const totalPhotos =
    (form.photos.cover ? 1 : 0) +
    form.photos.gallery.length +
    (form.photos.closing ? 1 : 0);

  const ytPreviewId = extractYouTubeId(form.music.youtubeUrl);

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <audio ref={audioRef} onEnded={() => setPlayingTrackId(null)} className="hidden" />

      <div className="rounded-3xl border border-stone-200/90 bg-white shadow-xs lg:col-span-7">
        <div className="rounded-t-3xl border-b border-stone-200/80 bg-stone-50/90 px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
            <span>
              Paso {step} de 9 {draftId ? '· Modo edición' : '· Nuevo borrador'}
            </span>
            <span className="rounded-full bg-stone-200/80 px-2.5 py-0.5 text-[11px] text-stone-800">
              {Math.round((step / 9) * 100)}% completado
            </span>
          </div>

          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-stone-900 transition-all duration-300"
              style={{ width: `${(step / 9) * 100}%` }}
            />
          </div>

          <div className="mt-3.5 flex gap-1.5 overflow-x-auto pb-1">
            {STEPS.map((label, idx) => {
              const stepNum = idx + 1;
              const active = stepNum === step;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(stepNum)}
                  className={`cursor-pointer whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-200/70'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {sessionError && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
            {sessionError}
          </div>
        )}

        {saveError && (
          <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
            {saveError}
          </div>
        )}

        {saveMessage && !saveError && (
          <div className="mx-6 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
            {saveMessage}
          </div>
        )}

        <div className="p-6 sm:p-7">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold tracking-tight text-stone-900">
                ¿Qué evento vas a celebrar?
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Elegí el tipo de celebración para adaptar los campos del asistente.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {EVENT_TYPES.map((item) => {
                  const selected = form.event_type === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => updateField('event_type', item.id)}
                      className={`cursor-pointer rounded-2xl border p-4 text-left transition ${
                        selected
                          ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                          : 'border-stone-200 bg-white text-stone-900 hover:border-stone-400'
                      }`}
                    >
                      <div className="text-sm font-semibold">{item.label}</div>
                      <div
                        className={`mt-1 text-xs ${
                          selected ? 'text-stone-300' : 'text-stone-500'
                        }`}
                      >
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              {form.event_type === 'otro' && (
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-stone-700">
                    Tipo de evento
                  </label>
                  <input
                    type="text"
                    value={form.event_type_other}
                    onChange={(e) => updateField('event_type_other', e.target.value)}
                    placeholder="Ej: Aniversario de 25 años"
                    className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-stone-900 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-stone-900">
                Datos principales
              </h2>
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  {form.event_type === 'casamiento' ? 'Nombres de los novios' : 'Nombre o título'}
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Ej: Camila & Mateo"
                  className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-stone-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700">Fecha y hora</label>
                <input
                  type="datetime-local"
                  value={form.event_date}
                  onChange={(e) => updateField('event_date', e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-stone-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Frase de bienvenida
                </label>
                <textarea
                  rows={3}
                  value={form.welcome_phrase}
                  onChange={(e) => updateField('welcome_phrase', e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm focus:border-stone-900 focus:outline-none"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-stone-900">
                Ubicación del evento
              </h2>
              {form.event_type === 'casamiento' && (
                <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-stone-700">
                    Ceremonia
                  </div>
                  <input
                    type="text"
                    value={form.ceremony_name}
                    onChange={(e) => updateField('ceremony_name', e.target.value)}
                    placeholder="Nombre de la iglesia o registro civil"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm"
                  />
                  <input
                    type="text"
                    value={form.ceremony_address}
                    onChange={(e) => updateField('ceremony_address', e.target.value)}
                    placeholder="Dirección de la ceremonia"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm"
                  />
                </div>
              )}

              <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  {form.event_type === 'casamiento' ? 'Fiesta / Recepción' : 'Lugar del evento'}
                </div>
                <input
                  type="text"
                  value={form.venue_name}
                  onChange={(e) => updateField('venue_name', e.target.value)}
                  placeholder="Nombre del salón o quinta"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm"
                />
                <input
                  type="text"
                  value={form.venue_address}
                  onChange={(e) => updateField('venue_address', e.target.value)}
                  placeholder="Dirección completa"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm"
                />
                <input
                  type="url"
                  value={form.venue_maps_url}
                  onChange={(e) => updateField('venue_maps_url', e.target.value)}
                  placeholder="Link de Google Maps (https://maps.google.com/...)"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-stone-900">
                Protagonistas y detalles
              </h2>
              {(form.event_type === 'casamiento' ||
                form.event_type === 'quince' ||
                form.event_type === 'baby_shower' ||
                form.event_type === 'otro') && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Padres / Anfitriones
                  </label>
                  <input
                    type="text"
                    value={form.parents_or_hosts}
                    onChange={(e) => updateField('parents_or_hosts', e.target.value)}
                    placeholder="Ej: Marta & Jorge · Silvia & Carlos"
                    className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
              )}
              {(form.event_type === 'casamiento' ||
                form.event_type === 'quince' ||
                form.event_type === 'bautismo') && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700">Padrinos</label>
                  <input
                    type="text"
                    value={form.godparents}
                    onChange={(e) => updateField('godparents', e.target.value)}
                    placeholder="Nombres de los padrinos"
                    className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
              )}
              {form.event_type === 'cumple' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700">Edad</label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={(e) => updateField('age', e.target.value)}
                    placeholder="Ej: 30"
                    className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
              )}
              {(form.event_type === 'baby_shower' || form.event_type === 'bautismo') && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700">Nombre</label>
                  <input
                    type="text"
                    value={form.baby_name}
                    onChange={(e) => updateField('baby_name', e.target.value)}
                    placeholder="Nombre del bebé"
                    className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-stone-900">
                    Fotos de la invitación
                  </h2>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Formatos JPG, PNG o WEBP · Compresión automática en el navegador · Máximo 8 fotos en total.
                  </p>
                </div>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-800">
                  {totalPhotos} / 8 fotos cargadas
                </span>
              </div>

              {uploadingPhoto && (
                <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-xs font-semibold text-stone-800">
                  Comprimiendo imagen y subiendo a Storage...
                </div>
              )}

              <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-stone-900">1. Foto de portada</span>
                    <span className="ml-2 rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Obligatoria · 1 foto
                    </span>
                  </div>
                  {form.photos.cover && (
                    <button
                      type="button"
                      onClick={() => removeSlotPhoto('cover')}
                      className="cursor-pointer text-xs font-medium text-red-600 hover:underline"
                    >
                      Quitar
                    </button>
                  )}
                </div>

                <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white px-4 py-3 text-xs font-semibold text-stone-700 hover:border-stone-500">
                  <span>{form.photos.cover ? 'Cambiar foto de portada' : 'Seleccionar foto de portada'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingPhoto}
                    onChange={(e) => handlePhotoUpload('cover', e.target.files?.[0])}
                    className="hidden"
                  />
                </label>

                {form.photos.cover && (
                  <img
                    src={form.photos.cover}
                    alt="Miniatura de portada"
                    className="mt-3 h-28 w-full rounded-xl object-cover border border-stone-200"
                  />
                )}
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-stone-900">2. Galería de fotos</span>
                    <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-800">
                      Hasta 6 fotos ({form.photos.gallery.length}/6)
                    </span>
                  </div>
                </div>

                {form.photos.gallery.length < 6 && (
                  <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white px-4 py-3 text-xs font-semibold text-stone-700 hover:border-stone-500">
                    <span>+ Agregar foto a la galería</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingPhoto}
                      onChange={(e) => handlePhotoUpload('gallery', e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                )}

                {form.photos.gallery.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {form.photos.gallery.map((url, idx) => (
                      <div key={`${url}-${idx}`} className="group relative overflow-hidden rounded-xl border border-stone-200">
                        <img
                          src={url}
                          alt={`Galería ${idx + 1}`}
                          className="h-20 w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeGalleryPhoto(idx)}
                          className="absolute top-1 right-1 cursor-pointer rounded-md bg-stone-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-stone-900">3. Foto de cierre</span>
                    <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold text-stone-700">
                      Opcional · 1 foto
                    </span>
                  </div>
                  {form.photos.closing && (
                    <button
                      type="button"
                      onClick={() => removeSlotPhoto('closing')}
                      className="cursor-pointer text-xs font-medium text-red-600 hover:underline"
                    >
                      Quitar
                    </button>
                  )}
                </div>

                <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white px-4 py-3 text-xs font-semibold text-stone-700 hover:border-stone-500">
                  <span>{form.photos.closing ? 'Cambiar foto de cierre' : 'Seleccionar foto de cierre'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingPhoto}
                    onChange={(e) => handlePhotoUpload('closing', e.target.files?.[0])}
                    className="hidden"
                  />
                </label>

                {form.photos.closing && (
                  <img
                    src={form.photos.closing}
                    alt="Miniatura de cierre"
                    className="mt-3 h-24 w-full rounded-xl object-cover border border-stone-200"
                  />
                )}
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-stone-900">Música de fondo</h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  Elegí una pista de nuestra biblioteca libre de derechos o pegá un link de YouTube. Solo se reproduce al tocar play.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['none', 'Sin música'],
                    ['library', 'Biblioteca libre de derechos'],
                    ['youtube', 'Link de YouTube'],
                  ] as const
                ).map(([modeKey, modeLabel]) => {
                  const active = form.music.mode === modeKey;
                  return (
                    <button
                      key={modeKey}
                      type="button"
                      onClick={() =>
                        updateField('music', {
                          ...form.music,
                          mode: modeKey,
                        })
                      }
                      className={`cursor-pointer rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${
                        active
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'
                      }`}
                    >
                      {modeLabel}
                    </button>
                  );
                })}
              </div>

              {form.music.mode === 'library' && (
                <div className="space-y-2.5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="text-xs font-semibold text-stone-700">
                    Pistas disponibles ({tracks.length})
                  </div>
                  {tracks.map((track) => {
                    const isSelected = form.music.trackId === track.id;
                    const isPlaying = playingTrackId === track.id;
                    return (
                      <div
                        key={track.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
                          isSelected
                            ? 'border-stone-900 bg-white shadow-2xs'
                            : 'border-stone-200 bg-white/80'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectLibraryTrack(track)}
                          className="cursor-pointer flex-1 text-left"
                        >
                          <div className="text-sm font-semibold text-stone-900">
                            {track.title}{' '}
                            {isSelected && (
                              <span className="text-xs text-emerald-700">(Seleccionada)</span>
                            )}
                          </div>
                          <div className="text-xs text-stone-500">
                            {track.artist || 'NB Invitaciones'}
                            {track.mood ? ` · ${track.mood}` : ''}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTogglePreviewTrack(track)}
                          className="cursor-pointer rounded-lg border border-stone-300 bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-200"
                        >
                          {isPlaying ? 'Pausar' : '▶ Escuchar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {form.music.mode === 'youtube' && (
                <div className="space-y-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <label className="block text-xs font-semibold text-stone-700">
                    Pegá el enlace de YouTube
                  </label>
                  <input
                    type="url"
                    value={form.music.youtubeUrl}
                    onChange={(e) =>
                      updateField('music', {
                        ...form.music,
                        mode: 'youtube',
                        youtubeUrl: e.target.value,
                        trackTitle: e.target.value ? 'Tema de YouTube' : '',
                      })
                    }
                    placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm"
                  />
                  {form.music.youtubeUrl && !ytPreviewId && (
                    <p className="text-xs text-amber-700">
                      Ingresá una URL válida de YouTube para detectar el video.
                    </p>
                  )}
                  {ytPreviewId && (
                    <p className="text-xs font-medium text-emerald-700">
                      Video detectado (ID: {ytPreviewId}). El invitado podrá reproducirlo desde el botón de música.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 7 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <h2 className="text-xl font-bold tracking-tight text-stone-900">
                  Confirmación, vestimenta y regalos
                </h2>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  WhatsApp del anfitrión
                </label>
                <input
                  type="tel"
                  value={form.host_whatsapp}
                  onChange={(e) => updateField('host_whatsapp', e.target.value)}
                  placeholder="Ej: +54 9 264 4123456"
                  className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Email para Google Sheet
                </label>
                <input
                  type="email"
                  value={form.sheet_email}
                  onChange={(e) => updateField('sheet_email', e.target.value)}
                  placeholder="tu@correo.com"
                  className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Código de vestimenta
                </label>
                <input
                  type="text"
                  value={form.dress_code}
                  onChange={(e) => updateField('dress_code', e.target.value)}
                  placeholder="Ej: Elegante Sport"
                  className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700">
                  Alias / CBU para regalos
                </label>
                <input
                  type="text"
                  value={form.gift_alias}
                  onChange={(e) => updateField('gift_alias', e.target.value)}
                  placeholder="Ej: camila.mateo.boda"
                  className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold tracking-tight text-stone-900">
                Secciones extras
              </h2>
              <div>
                <label className="block text-xs font-semibold text-stone-700">Cronograma</label>
                <input
                  type="text"
                  value={form.schedule_text}
                  onChange={(e) => updateField('schedule_text', e.target.value)}
                  placeholder="21:00 Recepción · 22:30 Cena · 01:00 Fiesta"
                  className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700">Hospedaje</label>
                <input
                  type="text"
                  value={form.lodging_text}
                  onChange={(e) => updateField('lodging_text', e.target.value)}
                  placeholder="Hoteles o recomendaciones cercanas"
                  className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700">Hashtag</label>
                <input
                  type="text"
                  value={form.hashtag}
                  onChange={(e) => updateField('hashtag', e.target.value)}
                  placeholder="#CamiYMateo2026"
                  className="mt-1.5 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
          )}

          {step === 9 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-stone-900">
                  Diseño y estilo visual
                </h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  Probá los diseños listos para la demo, ajustá color, tipografía y visibilidad de bloques.
                </p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {TEMPLATES.map((tpl) => {
                  const active = styleConfig.template_key === tpl.key;
                  return (
                    <button
                      key={tpl.key}
                      type="button"
                      disabled={!tpl.readyInPilot}
                      onClick={() => selectTemplate(tpl.key)}
                      className={`rounded-2xl border p-3.5 text-left transition ${
                        active
                          ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                          : tpl.readyInPilot
                            ? 'cursor-pointer border-stone-200 bg-white text-stone-900 hover:border-stone-400'
                            : 'cursor-not-allowed border-stone-200 bg-stone-50 text-stone-400'
                      }`}
                    >
                      <div className="text-xs font-bold">{tpl.name}</div>
                      <div className="mt-1 text-[11px] opacity-80">{tpl.badge}</div>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 rounded-2xl border border-stone-200 bg-stone-50/70 p-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Color principal
                  </label>
                  <div className="mt-1.5 flex items-center gap-3">
                    <input
                      type="color"
                      value={styleConfig.primary_color}
                      onChange={(e) =>
                        setStyleConfig((prev) => ({ ...prev, primary_color: e.target.value }))
                      }
                      className="h-10 w-14 cursor-pointer rounded-lg border border-stone-300 bg-white"
                    />
                    <span className="font-mono text-xs text-stone-600">
                      {styleConfig.primary_color}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700">
                    Tipografía
                  </label>
                  <select
                    value={styleConfig.font_preset}
                    onChange={(e) =>
                      setStyleConfig((prev) => ({
                        ...prev,
                        font_preset: e.target.value as FontPreset,
                      }))
                    }
                    className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="serif">Clásica editorial (Serif)</option>
                    <option value="sans">Moderna limpia (Sans)</option>
                    <option value="mono">Minimal técnica (Mono)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold text-stone-700">Secciones visibles</div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['hero', 'Portada'],
                      ['details', 'Protagonistas'],
                      ['location', 'Ubicación'],
                      ['extras', 'Extras'],
                      ['rsvp', 'Confirmación'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleSection(key)}
                      className={`cursor-pointer rounded-full border px-3.5 py-1 text-xs font-semibold transition ${
                        styleConfig.sections[key]
                          ? 'border-stone-900 bg-stone-900 text-white'
                          : 'border-stone-300 bg-white text-stone-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-5">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1 || savingDraft || uploadingPhoto}
              className="cursor-pointer rounded-xl border border-stone-300 px-4 py-2.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-40"
            >
              Anterior
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveDraft(step)}
                disabled={savingDraft || uploadingPhoto || !sessionReady}
                className="cursor-pointer rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-800 transition hover:bg-stone-50 disabled:opacity-40"
              >
                {savingDraft ? 'Guardando...' : draftId ? 'Guardar cambios' : 'Guardar borrador'}
              </button>

              {isAnonymous && (
                <button
                  type="button"
                  onClick={handleSaveAndRegister}
                  disabled={savingDraft || uploadingPhoto || !sessionReady}
                  className="cursor-pointer rounded-xl bg-emerald-700 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-40"
                >
                  Guardar con mi cuenta
                </button>
              )}

              {step < 9 && (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={savingDraft || uploadingPhoto || !sessionReady}
                  className="cursor-pointer rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:opacity-40"
                >
                  Siguiente
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-b-3xl border-t border-stone-200 bg-stone-50 px-6 py-3 text-xs text-stone-600">
          {isAnonymous ? 'Modo invitado' : 'Cuenta registrada'} ({sessionReady ? 'conectada' : 'iniciando...'})
          {draftSlug ? ` · Editando: ${draftSlug}` : ' · Borrador nuevo'}.
        </div>
      </div>

      <div className="lg:col-span-5">
        <InvitationPreview data={form} style={styleConfig} />
      </div>
    </div>
  );
}