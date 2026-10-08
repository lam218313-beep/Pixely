/**
 * A fake Pixely backend for the tests. It answers every endpoint the app calls with
 * believable data (dated around today), keeps the client's decisions in memory and
 * records every request so a test can check what the app sent.
 */
import type { Page, Route } from '@playwright/test';

export const API = 'http://api.pixely.test';
export const IMG = 'https://img.pixely.test';
export const CLIENT = 'cliente-prueba';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mNwc3MDAAFsAPV8l2FZAAAAAElFTkSuQmCC', 'base64');

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return iso(d); };

type Piece = Record<string, unknown> & { id: string; fecha: string };

function piece(id: string, fecha: string, extra: Partial<Piece>): Piece {
  return {
    id, client_id: CLIENT, fecha, formato: 'Imagen', pilar: 'Problema', topico_angulo: `Pieza ${id}`, marcador: null,
    estado_copy: 'Listo', estado_render: 'Listo', estado_publicado: 'Pendiente', estado_aprobacion: 'Pendiente',
    comentario_cliente: null, cambio_tipo: null,
    copy_instagram: 'Texto para Instagram con #hashtags', copy_linkedin: 'Texto para LinkedIn', copy_pinterest: null, copy_gbp: 'Texto para Google', copy_x: null,
    url_imagen: null, url_piezas_finales: [`${IMG}/${id}-1.png`],
    concepto_id: 'c1', concepto_ids: ['c1'], concepto: 'Café de origen', objetivo: 'Más visitas al local',
    evidencia: '3 competidores no muestran su proceso (Google Maps, 1 oct)', razon: 'Nadie en la zona cuenta de dónde viene su café.',
    descripcion_visual: 'Foto cenital de la taza con el saco de café detrás.',
    estructura: null, plan_estado: 'Aprobada', plan_comentario: null, publicada_at: null,
    ...extra,
  };
}

export type Scenario = 'full' | 'empty' | 'vitrina';

function seed(scenario: Scenario): ReturnType<typeof base> {
  return scenario === 'vitrina' ? vitrina(base('full')) : base(scenario);
}

function base(scenario: 'full' | 'empty') {
  if (scenario === 'empty') {
    return { pieces: [] as Piece[], brand: { status: 'empty', data: null }, review: { estado: 'Pendiente', comentario: null, revisada_at: null }, strategy: [], study: null, findings: [], results: { metrics: [], competitors: [] }, interview: { data: {} } };
  }
  const pieces: Piece[] = [
    // Validar: finished pieces waiting for the client.
    piece('v1', day(2), { topico_angulo: 'El viaje del grano', formato: 'Carrusel', url_piezas_finales: [`${IMG}/v1-1.png`, `${IMG}/v1-2.png`, `${IMG}/v1-3.png`] }),
    piece('v2', day(3), { topico_angulo: 'Detrás de la barra' }),
    piece('v3', day(5), { topico_angulo: 'Tu primer espresso', formato: 'Reel' }),
    // Already decided / in production.
    piece('a1', day(4), { topico_angulo: 'Promo de la semana', estado_aprobacion: 'Aprobado' }),
    piece('c1p', day(6), { topico_angulo: 'Nuestro barista', estado_aprobacion: 'Cambios solicitados', comentario_cliente: 'Más luz', cambio_tipo: 'imagen' }),
    piece('s1', day(1), { topico_angulo: 'Ya programada', estado_aprobacion: 'Aprobado', estado_publicado: 'Programado' }),
    // Published, with results.
    piece('p1', day(-2), { topico_angulo: 'Lo que más guardaron', estado_aprobacion: 'Aprobado', estado_publicado: 'Publicado', publicada_at: `${day(-2)}T15:00:00Z` }),
    piece('p2', day(-3), { topico_angulo: 'Otra publicada', estado_aprobacion: 'Aprobado', estado_publicado: 'Publicado', publicada_at: `${day(-3)}T15:00:00Z` }),
    // Plan: ideas waiting (no copy yet), one with its slides.
    piece('i1', day(9), { topico_angulo: 'Idea con estructura', formato: 'Carrusel', estado_copy: 'Pendiente', estado_render: 'Pendiente', plan_estado: 'Pendiente', url_piezas_finales: null,
      estructura: [{ n: 1, titulo: 'Portada', detalle: 'La pregunta' }, { n: 2, titulo: 'El origen' }, { n: 3, titulo: 'Cierre', detalle: 'Ven a probarlo' }] }),
    piece('i2', day(10), { topico_angulo: 'Idea sencilla', estado_copy: 'Pendiente', estado_render: 'Pendiente', plan_estado: 'Pendiente', url_piezas_finales: null }),
    piece('i3', day(11), { topico_angulo: 'Idea con cambios', estado_copy: 'Pendiente', estado_render: 'Pendiente', plan_estado: 'Cambios solicitados', plan_comentario: 'Otro día', url_piezas_finales: null }),
    // Odd data the app must survive.
    piece('x1', day(12), { topico_angulo: null, formato: null, pilar: null, concepto_id: null, concepto_ids: null, concepto: null, objetivo: null, evidencia: null, razon: null, descripcion_visual: null,
      estado_copy: 'Pendiente', plan_estado: null, estado_aprobacion: null, url_piezas_finales: null, copy_instagram: null, copy_linkedin: null, copy_gbp: null }),
  ];
  const metric = (id: string, k: number) => ({ piece_id: id, red: 'instagram', post_url: `https://instagram.com/p/${id}`, publicado_at: `${day(-2)}T15:00:00Z`,
    alcance: 1200 * k, vistas: 2000 * k, interacciones: 150 * k, likes: 100 * k, comentarios: 12 * k, guardados: 30 * k, compartidos: 8 * k, nuevos_seguidores: 5 * k });
  return {
    pieces,
    brand: { status: 'success', brand_name: 'Café Prueba', data: {
      archetype: 'El Explorador', arquetipo_razon: 'Buscan lo auténtico.', voz_estado: 'Pendiente', voz_comentario: null,
      tone_traits: [{ trait: 'Cercana', description: 'Habla de tú', ejemplo_si: 'Te esperamos', ejemplo_no: 'Se le espera' }, { trait: 'Curiosa' }],
      palabras_si: ['origen', 'tueste'], palabras_no: ['barato'], ejemplo_post: '¿Sabías de dónde viene tu café?',
    } },
    review: { estado: 'Pendiente', comentario: null, revisada_at: null },
    strategy: [
      { x: 0, y: 0, id: 'main', type: 'main', label: 'Café Prueba', parentId: null },
      { x: 0, y: 0, id: 'o1', type: 'objective', label: 'Objetivo principal', description: 'Más visitas al local. Otra frase.', parentId: 'main', tags: ['principal'] },
      { x: 0, y: 0, id: 'o2', type: 'objective', label: 'Ser referentes del café de origen', parentId: 'main' },
      { x: 0, y: 0, id: 's1', type: 'strategy', label: 'Estrategia: Mostrar el proceso', parentId: 'o1' },
      { x: 0, y: 0, id: 's2', type: 'strategy', label: 'Educar', parentId: 'o2' },
      { x: 0, y: 0, id: 'c1', type: 'concept', label: 'Café de origen', parentId: 's1' },
      { x: 0, y: 0, id: 'c2', type: 'concept', label: 'Métodos', parentId: 's2' },
    ],
    study: { ciudad: 'Lima', rubro: 'Cafetería', fecha_estudio: day(-20),
      universo_competidores: { total_detectado_maps: 40, total_relevante_filtrado: 12, listado: [{ nombre: 'Café Rival', rating: 4.5, reseñas: 320, categoria: 'Cafetería' }, { nombre: 'Otro Café', rating: 4.1, reseñas: 90 }] },
      dossier_profundo: [{ competidor: 'Café Rival', estadisticas_precio: { min: 8, max: 18, promedio: 12 } }],
      tamano_mercado: { rango_estimado: { min: 100000, max: 250000, moneda: 'PEN', periodo: 'mes' }, cruce_de_metodos: 'Encuesta y reseñas' } },
    findings: [
      { id: 'f1', fecha: day(-1), fuente: 'Instagram', tema: 'Precios', dato_o_angulo: 'Café Rival subió precios', cluster: 'Prueba', confianza: 'Alta', tipo_senal: 'precio', competidor: 'Café Rival' },
      { id: 'f2', fecha: day(-30), fuente: null, tema: null, dato_o_angulo: null, cluster: null, confianza: null, tipo_senal: null, competidor: null },
    ],
    results: { metrics: [metric('p1', 3), metric('p2', 1)], competitors: [{ mes: day(0).slice(0, 7), red: 'instagram', competidor: 'Café Rival', interacciones_prom: 200, seguidores: 5000 }] },
    interview: { data: { businessName: 'Café Prueba', industry: 'Cafetería', location: 'Lima', description: 'Cafetería de especialidad con granos de origen peruano.', audience: { location: 'Lima' }, products: ['Espresso', 'Filtrados'] }, updated_at: day(-10) },
  };
}

export interface Call { method: string; path: string; body: unknown }

export class MockApi {
  calls: Call[] = [];
  /** Paths (regex) that should answer with an error, e.g. { '/pieces$': 500 }. */
  failures = new Map<RegExp, number>();
  db: ReturnType<typeof seed>;

  constructor(scenario: Scenario = 'full') { this.db = seed(scenario); }

  fail(path: RegExp, status = 500) { this.failures.set(path, status); }
  sent(method: string, path: RegExp) { return this.calls.filter((c) => c.method === method && path.test(c.path)); }

  async install(page: Page) {
    await page.route(`${IMG}/**`, (r) => r.fulfill({ contentType: 'image/png', body: PNG }));
    await page.route(`${API}/**`, (r) => this.handle(r));
  }

  private async handle(route: Route) {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    let body: unknown = null;
    const raw = req.postData();
    if (raw) { try { body = JSON.parse(raw); } catch { body = Object.fromEntries(new URLSearchParams(raw)); } }
    this.calls.push({ method, path: `${path}${url.search}`, body });

    for (const [re, status] of this.failures) if (re.test(path)) return json(route, { detail: 'Error de prueba' }, status);

    const ok = (data: unknown) => json(route, { status: 'success', data });
    const db = this.db;
    const c = `/${CLIENT}`;
    let m: RegExpMatchArray | null;

    // --- Auth ---
    if (path === '/token') {
      const b = body as Record<string, string>;
      if (b.password !== 'clave-correcta') return json(route, { detail: 'Incorrect username or password' }, 401);
      return json(route, session(b.username));
    }
    if (path === '/auth/refresh') return json(route, session('prueba@pixely.pe'));

    // --- Content ---
    if (path === `/content${c}/pieces`) return ok(db.pieces);
    if ((m = path.match(new RegExp(`^/content${c}/pieces/([^/]+)/review$`)))) {
      const b = body as { estado: string; comentario: string | null; cambio_tipo: string | null };
      return ok(this.update(m[1], { estado_aprobacion: b.estado, comentario_cliente: b.comentario, cambio_tipo: b.cambio_tipo }));
    }
    if ((m = path.match(new RegExp(`^/content${c}/pieces/([^/]+)/plan-review$`)))) {
      const b = body as { estado: string; comentario: string | null };
      return ok(this.update(m[1], { plan_estado: b.estado, plan_comentario: b.comentario }));
    }
    if (path === `/content${c}/plan-review/approve-pending`) {
      const month = url.searchParams.get('month') ?? '';
      const changed = db.pieces.filter((p) => p.fecha.startsWith(month) && (p.plan_estado ?? 'Pendiente') === 'Pendiente' && p.estado_copy === 'Pendiente');
      changed.forEach((p) => { p.plan_estado = 'Aprobada'; });
      return ok(changed);
    }
    if (path === `/content${c}/results`) return ok(db.results);

    // --- Marca ---
    if (path === `/brand${c}`) return json(route, db.brand, db.brand.status === 'empty' ? 404 : 200);
    if (path === `/brand${c}/voice/review`) {
      const b = body as { estado: string; comentario: string | null };
      if (db.brand.data) Object.assign(db.brand.data, { voz_estado: b.estado, voz_comentario: b.comentario });
      return ok({ voz_estado: b.estado, voz_comentario: b.comentario });
    }
    if (path === `/strategy${c}`) return json(route, db.strategy); // the real endpoint returns the bare list
    if (path === `/strategy${c}/review`) {
      if (method === 'PATCH') { const b = body as { estado: string; comentario: string | null }; db.review = { estado: b.estado, comentario: b.comentario, revisada_at: new Date().toISOString() }; }
      return ok(db.review);
    }
    if (path === `/market${c}/study`) return ok(db.study);
    if (path === `/market${c}/findings`) return ok(db.findings);
    if (path === `/market${c}/report.pdf`) return route.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="mercado-cafe-prueba.pdf"' }, body: '%PDF-1.4\n%%EOF' });
    if (path === `/clients${c}/interview`) return json(route, db.interview);

    // --- Team panel (frontend/layout) ---
    if (path === '/users/me') return json(route, { id: 'u1', email: 'equipo@pixely.pe', full_name: 'Equipo Pixely', role: 'admin', is_active: true });
    if (path === '/clients' || path === '/clients/') return json(route, [{ id: CLIENT, nombre: 'Café Prueba', industry: 'Cafetería', is_active: true, created_at: day(-60) }]);
    if (path === '/api/admin/overview') return ok({ hoy: day(0), marcas: [adminBrand()] });
    // Alta de cliente (asistente del panel del equipo)
    if (path === '/api/admin/brands' && method === 'POST') return json(route, { id: 'marca-nueva', nombre: (body as { nombre: string }).nombre, user_count: 0, modules: [] });
    if (path === '/api/admin/brands/marca-nueva/settings' && method === 'PUT') return ok(body);
    if (path === '/api/admin/brands/marca-nueva/users' && method === 'POST') return json(route, { id: 'u-nuevo', email: (body as { email: string }).email, brand_id: 'marca-nueva' });
    if (path === `/api/admin/brands${c}`) return json(route, { users: [{ id: 'u2', email: 'prueba@pixely.pe', full_name: 'Ana', role: 'analyst', created_at: day(-30) }] });
    if (path === `/api/admin/brands${c}/settings`) return ok({ plan: 'Pro', fotos_mes: 12, reels_mes: 4, redes: ['instagram', 'linkedin', 'gbp'], metricool_brand_id: '123', metricool_nombre: 'Café Prueba', ciudad: 'Lima', rubro: 'Cafetería', contacto_nombre: 'Ana', contacto_email: 'ana@cafe.pe', contacto_telefono: '999 999 999' });
    if (path === `/clients${c}/personas`) return json(route, { personas: [] });
    if (path === `/brand${c}/colors`) return ok({ colors: body });
    if (path === '/strategy/sync') return ok({ synced: true });
    if ((m = path.match(new RegExp(`^/content${c}/pieces/([^/]+)/finals$`)))) return ok(this.update(m[1], { url_piezas_finales: [`${IMG}/${m[1]}-final.png`] }));

    return json(route, { detail: `Mock: ruta no prevista ${method} ${path}` }, 404);
  }

  private update(id: string, patch: Record<string, unknown>) {
    const p = this.db.pieces.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
    return p;
  }
}

function adminBrand() {
  return { id: CLIENT, nombre: 'Café Prueba', usuarios: 2,
    config: { plan: 'Pro', fotos_mes: 12, reels_mes: 4, redes: ['instagram', 'linkedin', 'gbp'], metricool: true, completa: true },
    pasos: { ficha: 'listo', mercado: 'listo', voz: 'cliente', estrategia: 'cliente' },
    contenido: { mes: day(0).slice(0, 7), plan_mes: 12, plan_siguiente: 0, ideas_pendientes: 3, ideas_cambios: 1, en_produccion: 2, por_revisar: 3, por_programar: 1 },
    ultima_vigilancia: day(-1), ultimos_resultados: day(-2),
    acciones: [
      { quien: 'cliente', texto: 'Revisar 3 piezas', n: 3, receta: null, destino: 'validacion' },
      { quien: 'equipo', texto: 'Ajustar 1 idea con cambios', n: 1, receta: '/05_planificacion', destino: 'planificacion' },
    ] };
}

/**
 * "Casa Norte": the demo brand used for the screenshots on pixely.pe (e2e/vitrina.spec.ts).
 * A fashion boutique in Miraflores; its pieces use Pixely's own production photos. No real client.
 */
export const VITRINA_IMG = (name: string) => `${IMG}/vitrina/${name}`;
/** Las fotos de esas piezas viven junto a las pruebas (e2e/vitrina-img/<nombre>.jpg), sin depender de otro repo. */
export const VITRINA_IMG_DIR = new URL('./vitrina-img/', import.meta.url);
function vitrina(db: ReturnType<typeof base>) {
  const P = (id: string) => db.pieces.find((p) => p.id === id)!;
  const set = (id: string, v: Partial<Piece>) => Object.assign(P(id), v);
  set('v1', { topico_angulo: 'Tres formas de llevar el negro', url_piezas_finales: ['rubro-moda', 'historia', 'tienda'].map(VITRINA_IMG),
    copy_instagram: 'El negro no es aburrido: es la base de todo. Te mostramos tres formas de llevarlo esta semana. Ven a probártelas a Casa Norte, Miraflores.',
    copy_linkedin: 'Tres combinaciones en negro que funcionan para la oficina y para la noche.', copy_gbp: 'Nuevas combinaciones en negro, disponibles en tienda.',
    razon: 'Las búsquedas de "outfit negro" suben en octubre y tu competencia no lo está mostrando.', evidencia: '4 de 6 boutiques de la zona no muestran combinaciones completas (Instagram, 2 oct)' });
  set('v2', { topico_angulo: 'La zapatilla blanca que va con todo', url_piezas_finales: [VITRINA_IMG('zapatilla')],
    copy_instagram: 'Una sola zapatilla, siete looks. La blanca de cuero vuelve a Casa Norte.', copy_linkedin: 'La zapatilla blanca de cuero, de vuelta en tienda.' });
  set('v3', { topico_angulo: 'Así elegimos cada prenda', url_piezas_finales: [VITRINA_IMG('tienda')] });
  set('a1', { topico_angulo: 'Cueros que duran', url_piezas_finales: [VITRINA_IMG('rubro-accesorios')] });
  set('c1p', { topico_angulo: 'Nuestra asesora te recibe', url_piezas_finales: [VITRINA_IMG('problema-fotos')], comentario_cliente: 'Más luz en la cara' });
  set('s1', { topico_angulo: 'Nueva colección de carteras', url_piezas_finales: [VITRINA_IMG('rubro-accesorios')] });
  set('p1', { topico_angulo: 'Detrás del mostrador', url_piezas_finales: [VITRINA_IMG('mostrador')] });
  set('p2', { topico_angulo: 'El cliente que vuelve', url_piezas_finales: [VITRINA_IMG('historia')] });
  set('i1', { topico_angulo: 'Cómo elegir tu talla sin probarte', descripcion_visual: 'Carrusel con la cinta métrica sobre la mesa de madera y las prendas dobladas.',
    estructura: [{ n: 1, titulo: '¿Qué talla soy?', detalle: 'La duda de siempre' }, { n: 2, titulo: 'Mide esto', detalle: 'Pecho, cintura y largo' }, { n: 3, titulo: 'Compara', detalle: 'Nuestra tabla' }, { n: 4, titulo: 'Escríbenos', detalle: 'Te asesoramos por WhatsApp' }],
    razon: 'La duda de talla es la primera razón por la que no compran por redes en tu rubro.', evidencia: '38 % de las reseñas negativas de la zona mencionan tallas (Google Maps, 1 oct)' });
  set('i2', { topico_angulo: 'Lo nuevo de la semana', razon: 'Tu público responde más los jueves por la noche.' });
  set('i3', { topico_angulo: 'Una prenda, tres ocasiones', plan_comentario: 'Mejor el viernes' });
  set('x1', { topico_angulo: 'Detalles que se notan', formato: 'Imagen', pilar: 'Identidad', concepto_id: 'c2', concepto_ids: ['c2'], plan_estado: 'Pendiente' });
  db.pieces.forEach((p) => { if (p.concepto === 'Café de origen') { p.concepto = 'Moda que dura'; p.objetivo = 'Más visitas a la tienda'; } });
  db.brand = { status: 'success', brand_name: 'Casa Norte', data: {
    archetype: 'El Creador', arquetipo_razon: 'Viste a quien quiere verse bien sin seguir a la masa: piezas pensadas, hechas para durar.', voz_estado: 'Pendiente', voz_comentario: null,
    tone_traits: [{ trait: 'Cercana', description: 'Habla de tú, como la asesora de la tienda', ejemplo_si: 'Ven a probártela', ejemplo_no: 'Adquiera el producto' }, { trait: 'Segura' }, { trait: 'Elegante' }, { trait: 'Honesta' }],
    palabras_si: ['pieza', 'durar', 'a tu medida'], palabras_no: ['oferta', 'barato'], ejemplo_post: 'Una prenda bien elegida vale por diez.' } };
  db.strategy = [
    { x: 0, y: 0, id: 'main', type: 'main', label: 'Casa Norte', parentId: null },
    { x: 0, y: 0, id: 'o1', type: 'objective', label: 'Más visitas a la tienda', parentId: 'main', tags: ['principal'] },
    { x: 0, y: 0, id: 'o2', type: 'objective', label: 'Ser la boutique de referencia en Miraflores', parentId: 'main' },
    { x: 0, y: 0, id: 's1', type: 'strategy', label: 'Mostrar cómo se combina', parentId: 'o1' },
    { x: 0, y: 0, id: 's2', type: 'strategy', label: 'Resolver las dudas de compra', parentId: 'o2' },
    { x: 0, y: 0, id: 'c1', type: 'concept', label: 'Moda que dura', parentId: 's1' },
    { x: 0, y: 0, id: 'c2', type: 'concept', label: 'Talla perfecta', parentId: 's2' },
  ];
  db.study = { ciudad: 'Miraflores, Lima', rubro: 'Boutiques de moda', fecha_estudio: day(-20),
    universo_competidores: { total_detectado_maps: 64, total_relevante_filtrado: 18, listado: [{ nombre: 'Atelier Sur', rating: 4.6, reseñas: 410, categoria: 'Boutique' }, { nombre: 'Moda Larco', rating: 4.3, reseñas: 180 }] },
    dossier_profundo: [{ competidor: 'Atelier Sur', estadisticas_precio: { min: 89, max: 420, promedio: 189 } }],
    tamano_mercado: { rango_estimado: { min: 380000, max: 620000, moneda: 'PEN', periodo: 'mes' }, cruce_de_metodos: 'Cifras del sector y negocios × ticket × pedidos' } };
  db.findings = [
    { id: 'f1', fecha: day(-1), fuente: 'Instagram', tema: 'Tallas', dato_o_angulo: 'Atelier Sur empezó a publicar guías de talla', cluster: 'Problema', confianza: 'Alta', tipo_senal: 'contenido', competidor: 'Atelier Sur' },
    { id: 'f2', fecha: day(-3), fuente: 'Google Maps', tema: 'Atención', dato_o_angulo: 'Las reseñas premian la asesoría personalizada', cluster: 'Prueba', confianza: 'Alta', tipo_senal: 'reseñas', competidor: null },
    { id: 'f3', fecha: day(-6), fuente: 'Instagram', tema: 'Precios', dato_o_angulo: 'Moda Larco lanzó descuentos de temporada', cluster: 'Identidad', confianza: 'Media', tipo_senal: 'precio', competidor: 'Moda Larco' },
  ];
  db.results.competitors = [{ mes: day(0).slice(0, 7), red: 'instagram', competidor: 'Atelier Sur', interacciones_prom: 260, seguidores: 12400 }];
  db.interview = { data: { businessName: 'Casa Norte', industry: 'Boutique de moda', location: 'Miraflores, Lima', description: 'Boutique de moda y accesorios de cuero, con asesoría personalizada.', audience: { location: 'Miraflores, Lima' }, products: ['Ropa', 'Carteras de cuero', 'Zapatillas'] }, updated_at: day(-10) };
  return db;
}

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Expose-Headers': 'Content-Disposition' };
const json = (route: Route, data: unknown, status = 200) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(data) });

function session(email: string) {
  return { access_token: 'token-de-prueba', refresh_token: 'refresh-de-prueba', expires_at: Math.floor(Date.now() / 1000) + 3600, user_email: email, role: 'client', ficha_cliente_id: CLIENT };
}

/** What the app keeps in the browser once signed in (same key as src/lib/session.ts). */
export const SIGNED_IN = JSON.stringify({ token: 'token-de-prueba', refreshToken: 'refresh-de-prueba', expiresAt: Math.floor(Date.now() / 1000) + 3600, email: 'prueba@pixely.pe', role: 'client', clientId: CLIENT });
