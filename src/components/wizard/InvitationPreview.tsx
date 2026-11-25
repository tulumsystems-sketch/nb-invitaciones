import React, { useState } from 'react';
import type { InvitationStyleConfig } from '../../lib/templates';

export interface InvitationPhotos {
  cover: string | null;
  gallery: string[];
  closing: string | null;
}

export interface InvitationMusicConfig {
  mode: 'none' | 'library' | 'youtube';
  trackId: string | null;
  trackTitle: string;
  trackUrl: string;
  youtubeUrl: string;
}

export interface PreviewData {
  event_type: string;
  event_type_other: string;
  title: string;
  event_date: string;
  welcome_phrase: string;
  venue_name: string;
  venue_address: string;
  venue_maps_url: string;
  ceremony_name: string;
  ceremony_address: string;
  parents_or_hosts: string;
  godparents: string;
  age: string;
  baby_name: string;
  dress_code: string;
  gift_alias: string;
  schedule_text: string;
  lodging_text: string;
  hashtag: string;
  photos?: InvitationPhotos;
  music?: InvitationMusicConfig;
}

interface Props {
  data: PreviewData;
  style: InvitationStyleConfig;
}

function formatEventDate(raw: string): string {
  if (!raw) return 'Fecha y hora por confirmar';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString('es-AR', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  return match ? match[1] : null;
}

export default function InvitationPreview({ data, style }: Props) {
  const [audioPlaying, setAudioPlaying] = useState(false);

  const fontStyle: React.CSSProperties =
    style.font_preset === 'serif'
      ? { fontFamily: "'Cormorant Garamond', Georgia, serif" }
      : style.font_preset === 'mono'
        ? { fontFamily: "'JetBrains Mono', monospace" }
        : { fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" };

  const isMinimal = style.template_key === 'minimalista-moderno';
  const displayTitle = data.title.trim() || 'Camila & Mateo';
  const eventLabel =
    data.event_type === 'otro'
      ? data.event_type_other.trim() || 'Celebración especial'
      : data.event_type.replace('_', ' ');

  const coverUrl = data.photos?.cover || null;
  const galleryUrls = data.photos?.gallery || [];
  const closingUrl = data.photos?.closing || null;

  const music = data.music;
  const ytId = music?.mode === 'youtube' ? extractYouTubeId(music.youtubeUrl) : null;
  const hasMusic =
    (music?.mode === 'library' && Boolean(music.trackTitle)) ||
    (music?.mode === 'youtube' && Boolean(ytId));

  return (
    <div className="sticky top-20 overflow-hidden rounded-3xl border border-stone-300/80 bg-gradient-to-b from-stone-200/75 to-stone-200/45 p-3.5 sm:p-4 shadow-sm">
      {/* Barra superior de vista previa */}
      <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-amber-300/70 bg-amber-100/95 px-3.5 py-2 text-[11px] font-semibold text-amber-950">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
          VISTA PREVIA · BORRADOR
        </span>
        <span className="rounded-lg bg-white/90 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-stone-800 shadow-2xs">
          {isMinimal ? '02 · Minimalista' : '01 · Clásico'}
        </span>
      </div>

      {/* Lienzo de la invitación */}
      <div
        key={`${style.template_key}-${style.font_preset}`}
        style={fontStyle}
        className={`animate-nb-scale-in mx-auto max-w-md overflow-hidden rounded-2xl transition-all duration-300 ${
          isMinimal
            ? 'border border-stone-200/90 bg-white text-stone-900 shadow-sm'
            : 'border border-[#d9ceb8] bg-[#fcfaf5] text-stone-900 shadow-sm'
        }`}
      >
        {/* Reproductor manual */}
        {hasMusic && (
          <div
            className={`flex items-center justify-between px-5 py-2.5 text-xs transition-colors ${
              isMinimal
                ? 'border-b border-stone-100 bg-stone-50/90 text-stone-700'
                : 'border-b border-[#e8decb] bg-[#f4ede0] text-stone-800'
            }`}
          >
            <span className="truncate font-medium">
              ♪ {music?.mode === 'youtube' ? 'Tema en YouTube' : music?.trackTitle}
            </span>
            <button
              type="button"
              onClick={() => setAudioPlaying((prev) => !prev)}
              className="ml-3 shrink-0 cursor-pointer rounded-full px-3 py-1 text-[11px] font-semibold text-white transition active:scale-95"
              style={{ backgroundColor: style.primary_color }}
            >
              {audioPlaying ? 'Pausar' : 'Reproducir'}
            </button>
          </div>
        )}

        {audioPlaying && ytId && (
          <div className="animate-nb-fade-up border-b border-stone-200 bg-stone-950 p-2">
            <iframe
              className="h-36 w-full rounded-xl"
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
              title="Música de la invitación"
              allow="autoplay; encrypted-media"
            />
          </div>
        )}

        {/* Foto de portada */}
        {coverUrl && (
          <div className="relative h-56 w-full overflow-hidden">
            <img
              src={coverUrl}
              alt={`Portada de ${displayTitle}`}
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
            />
            {!isMinimal && (
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#fcfaf5] via-transparent to-black/10" />
            )}
          </div>
        )}

        {/* Marco interior sutil para el Diseño 1 Clásico */}
        <div className={isMinimal ? 'p-6 sm:p-7' : 'p-4 sm:p-5'}>
          <div
            className={
              isMinimal
                ? ''
                : 'rounded-xl border border-[#e3d7c1] bg-[#fcfaf5]/90 px-5 py-6 sm:px-6'
            }
          >
            {/* Portada / Encabezado */}
            {style.sections.hero && (
              <div
                className={`pb-6 ${
                  isMinimal
                    ? 'border-b border-stone-200/80 text-left'
                    : 'border-b border-[#e5d9c3] text-center'
                }`}
              >
                <span
                  className="inline-block rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                  style={{
                    color: style.primary_color,
                    backgroundColor: `${style.primary_color}14`,
                  }}
                >
                  {eventLabel}
                </span>

                <h3
                  className={`mt-3.5 font-bold leading-[1.08] ${
                    isMinimal
                      ? 'text-3xl tracking-tight text-stone-900'
                      : 'text-4xl italic text-stone-900'
                  }`}
                >
                  {displayTitle}
                </h3>

                {!isMinimal && (
                  <div className="mx-auto my-3.5 flex items-center justify-center gap-2 text-xs opacity-70" style={{ color: style.primary_color }}>
                    <span className="h-px w-8 bg-current opacity-40" />
                    <span>✦</span>
                    <span className="h-px w-8 bg-current opacity-40" />
                  </div>
                )}

                <p className="mt-3 text-sm leading-relaxed text-stone-600">
                  {data.welcome_phrase || 'Nos encantaría compartir este momento tan especial con vos.'}
                </p>

                <div
                  className={`mt-4 inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium ${
                    isMinimal
                      ? 'border border-stone-200 bg-stone-50 text-stone-800'
                      : 'border border-[#dfd2ba] bg-white text-stone-800 shadow-2xs'
                  }`}
                >
                  <span>{formatEventDate(data.event_date)}</span>
                </div>
              </div>
            )}

            {/* Protagonistas y detalles */}
            {style.sections.details &&
              (data.parents_or_hosts ||
                data.godparents ||
                data.age ||
                data.baby_name ||
                data.dress_code) && (
                <div className="space-y-2.5 border-b border-stone-200/80 py-5 text-sm text-stone-700">
                  {data.parents_or_hosts && (
                    <div className={isMinimal ? '' : 'text-center'}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                        Padres / Anfitriones
                      </div>
                      <div className="mt-0.5 font-medium text-stone-900">
                        {data.parents_or_hosts}
                      </div>
                    </div>
                  )}
                  {data.godparents && (
                    <div className={isMinimal ? '' : 'text-center'}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                        Padrinos
                      </div>
                      <div className="mt-0.5 font-medium text-stone-900">{data.godparents}</div>
                    </div>
                  )}
                  {data.age && (
                    <div className={isMinimal ? '' : 'text-center'}>
                      <span className="font-semibold text-stone-900">Festeja: </span>
                      {data.age} años
                    </div>
                  )}
                  {data.baby_name && (
                    <div className={isMinimal ? '' : 'text-center'}>
                      <span className="font-semibold text-stone-900">Protagonista: </span>
                      {data.baby_name}
                    </div>
                  )}
                  {data.dress_code && (
                    <div className={`pt-1 ${isMinimal ? '' : 'text-center'}`}>
                      <span
                        className={`inline-block rounded-lg px-3 py-1 text-xs font-medium ${
                          isMinimal
                            ? 'bg-stone-100 text-stone-800'
                            : 'border border-[#e2d6c0] bg-white text-stone-800'
                        }`}
                      >
                        Dress code: {data.dress_code}
                      </span>
                    </div>
                  )}
                </div>
              )}

            {/* Ubicación */}
            {style.sections.location && (
              <div className="space-y-3 border-b border-stone-200/80 py-5 text-xs text-stone-700">
                <div
                  className={`text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 ${
                    isMinimal ? '' : 'text-center'
                  }`}
                >
                  Ubicación
                </div>

                {data.ceremony_name && (
                  <div
                    className={`rounded-xl p-3.5 ${
                      isMinimal
                        ? 'border border-stone-200/80 bg-stone-50/70'
                        : 'border border-[#e3d7c1] bg-white text-center'
                    }`}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                      Ceremonia
                    </div>
                    <div className="mt-0.5 text-sm font-semibold text-stone-900">
                      {data.ceremony_name}
                    </div>
                    {data.ceremony_address && (
                      <div className="mt-0.5 text-stone-600">{data.ceremony_address}</div>
                    )}
                  </div>
                )}

                <div
                  className={`rounded-xl p-3.5 ${
                    isMinimal
                      ? 'border border-stone-200/80 bg-stone-50/70'
                      : 'border border-[#e3d7c1] bg-white text-center'
                  }`}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    {data.event_type === 'casamiento' ? 'Fiesta / Recepción' : 'Lugar del evento'}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-stone-900">
                    {data.venue_name || 'Lugar por confirmar'}
                  </div>
                  {data.venue_address && (
                    <div className="mt-0.5 text-stone-600">{data.venue_address}</div>
                  )}
                  {data.venue_maps_url && (
                    <a
                      href={data.venue_maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold underline transition hover:opacity-80"
                      style={{ color: style.primary_color }}
                    >
                      Ver ubicación en Maps →
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Galería */}
            {galleryUrls.length > 0 && (
              <div className="border-b border-stone-200/80 py-5">
                <div
                  className={`mb-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 ${
                    isMinimal ? '' : 'text-center'
                  }`}
                >
                  Galería
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {galleryUrls.map((url, idx) => (
                    <img
                      key={`${url}-${idx}`}
                      src={url}
                      alt={`Galería ${idx + 1}`}
                      className="h-20 w-full rounded-xl border border-stone-200/80 object-cover transition duration-300 hover:scale-[1.03]"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Extras */}
            {style.sections.extras &&
              (data.schedule_text || data.lodging_text || data.gift_alias || data.hashtag) && (
                <div
                  className={`space-y-2 border-b border-stone-200/80 py-5 text-xs text-stone-700 ${
                    isMinimal ? '' : 'text-center'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                    Detalles extra
                  </div>
                  {data.schedule_text && (
                    <div>
                      <span className="font-semibold text-stone-900">Cronograma: </span>
                      {data.schedule_text}
                    </div>
                  )}
                  {data.lodging_text && (
                    <div>
                      <span className="font-semibold text-stone-900">Hospedaje: </span>
                      {data.lodging_text}
                    </div>
                  )}
                  {data.gift_alias && (
                    <div>
                      <span className="font-semibold text-stone-900">Regalos: </span>
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-stone-900">
                        {data.gift_alias}
                      </span>
                    </div>
                  )}
                  {data.hashtag && (
                    <div
                      className="pt-1 text-sm font-semibold"
                      style={{ color: style.primary_color }}
                    >
                      {data.hashtag}
                    </div>
                  )}
                </div>
              )}

            {/* Foto de cierre */}
            {closingUrl && (
              <div className="mt-5 overflow-hidden rounded-xl border border-stone-200/80">
                <img
                  src={closingUrl}
                  alt="Foto de cierre"
                  className="h-36 w-full object-cover transition duration-500 hover:scale-[1.02]"
                />
              </div>
            )}

            {/* Confirmación RSVP */}
            {style.sections.rsvp && (
              <div className="pt-5 text-center">
                <button
                  type="button"
                  disabled
                  className="w-full rounded-xl py-2.5 text-xs font-semibold text-white shadow-xs opacity-95"
                  style={{ backgroundColor: style.primary_color }}
                >
                  Confirmar asistencia (disponible al publicar)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}