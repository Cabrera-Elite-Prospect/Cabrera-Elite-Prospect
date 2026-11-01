/* ============================================================================
   CONFIGURACION DE CONTENIDO (llena solo lo que tengas; lo vacío NO se muestra)
   Cabrera Elite - edita este archivo, guarda y publica. No hace falta tocar index.html.
   - Fotos de atletas (menores): usa SOLO las de familias que marcaron la autorización de medios.
   - Testimonios: usa solo textos reales y con permiso de la persona.
   ============================================================================ */
window.CE_CONFIG = {

  // Enlace para dejar reseña en Google (Perfil de Empresa > "Pedir reseñas" > copiar enlace). Vacío = sin botón.
  googleReviewUrl: '',

  // Redes extra (Instagram y TikTok ya están en el sitio). Vacío = no se muestran.
  facebookUrl: '',
  youtubeUrl: '',

  // Cuántos atletas por entrenador en cada sesión (solo el número, ej. 8). Vacío = no se muestra.
  athletesPerCoach: '',

  // ---- VIDEO (sección "Míranos en acción") ----
  // Enlace del reel en Instagram. Con solo esto, la sección muestra una tarjeta que lleva a Instagram a ver el video completo.
  videoUrl: 'https://www.instagram.com/reel/DfKADk_BEFS/',
  // Para que una PARTE del video se reproduzca en tu página y el resto se vea en Instagram:
  //   1) Recorta los primeros segundos del video (CapCut, o el editor del celular) y expórtalo como MP4 liviano (menos de 5 MB).
  //   2) Súbelo a la carpeta images/ de GitHub con el nombre teaser.mp4 (y una foto de portada teaser.jpg).
  //   3) Escribe aquí abajo 'images/teaser.mp4' y 'images/teaser.jpg'.
  videoTeaser: 'images/teaser.mp4',
  videoPoster: 'images/teaser.jpg',
  videoSeconds: 10,     // el clip se detiene a estos segundos y aparece el botón "Ver completo en Instagram"

  // ---- HORARIO SEMANAL (vacío = no se muestra). Pon SOLO los días reales. Ejemplo:
  // { day_en: 'Monday', day_es: 'Lunes', time: '4:30 – 6:30 pm', note_en: 'All levels', note_es: 'Todos los niveles' }
  schedule: [],

  // Enlace para que las familias agenden su evaluación gratis con fecha y hora (Cal.com, Calendly o Google Calendar).
  // Debe empezar con https://. Vacío = no se muestra el botón.
  bookingUrl: '',

  // ---- TIENDA (vacío = el enlace "Tienda" no aparece en el menú) ----
  // Cada producto. 'buyUrl' = enlace de pago de Stripe (Payment Link). Si lo dejas vacío, el botón pide el producto por WhatsApp.
  // { name_en: 'Practice jersey', name_es: 'Camiseta de práctica', price: '35',
  //   desc_en: 'Breathable, team colors.', desc_es: 'Transpirable, colores del equipo.',
  //   sizes: ['YS','YM','YL','AS','AM','AL'], photo: 'images/store/jersey.jpg',
  //   buyUrl: 'https://buy.stripe.com/...' }
  products: [],

  // Testimonios reales. Ejemplo:
  // { name: 'María P.', role_en: 'Parent of a 12-year-old', role_es: 'Madre de atleta de 12 años',
  //   text_en: '...', text_es: '...', photo: 'images/gallery/maria.jpg' }   // photo es opcional
  testimonials: [],

  // Galería de fotos de entrenamientos. Sube la foto a images/gallery/ y agrega:
  // { src: 'images/gallery/bateo1.jpg', alt_en: 'Batting practice', alt_es: 'Práctica de bateo' }
  gallery: [],

  // Atletas destacados (resultados reales). Ejemplo:
  // { name: 'Nombre', detail_en: 'Signed with ...', detail_es: 'Firmó con ...', photo: 'images/gallery/atleta.jpg' }
  featuredAthletes: [],

  // Ofertas (referidos, plan hermanos, campamentos...). Ejemplo:
  // { title_en: 'Sibling discount', title_es: 'Descuento para hermanos',
  //   text_en: '...', text_es: '...' }
  offers: []
};
