# Scoundrel (PWA)

Adaptación no oficial para móvil de **Scoundrel**, el roguelike de una sola baraja de Zach Gage y Kurt Bieg (2011).
Se juega en horizontal, funciona sin conexión y se instala en el iPhone como app (PWA).

- HTML + CSS + JavaScript (módulos ES), **sin build ni dependencias**.
- Arte pixel generado en SVG y sonido sintetizado con Web Audio: no hay assets de terceros.
- Ranking mundial opcional con Supabase (plan gratuito).

## Probar en local

```bash
npm test          # tests del motor de reglas (node --test)
npm run serve     # http://localhost:5173
```

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub (p. ej. `scoundrel`) y sube esta carpeta:
   ```bash
   git init && git add . && git commit -m "Scoundrel PWA"
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/scoundrel.git
   git push -u origin main
   ```
2. En el repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. En un minuto estará en `https://<tu-usuario>.github.io/scoundrel/`.
4. En el iPhone: ábrelo en **Safari → Compartir → Añadir a pantalla de inicio**. Ábrelo desde el icono para jugar a pantalla completa.

Al publicar cambios, sube `VERSION` en `sw.js` para que la caché offline se renueve.

> El audio de Web Audio en iOS respeta el interruptor de silencio: si no oyes nada, quita el modo silencio.

## Ranking mundial con Supabase (opcional, gratis)

Sin configurar, el juego funciona igual y guarda récord, racha e historial en el propio móvil.

1. Crea una cuenta y un proyecto gratuito en [supabase.com](https://supabase.com).
2. **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
   Crea la tabla `scores` (lectura pública) y la función `submit_score`, la única vía para escribir: valida nombre,
   rango de puntuación y limita a un envío cada 30 s por nombre.
3. **Project Settings → API**: copia la *Project URL* y la clave *anon public* en [`js/config.js`](js/config.js).
   La clave anon es pública por diseño; la protección la dan las políticas RLS.
4. **Keep-alive** (Supabase pausa los proyectos gratis tras 7 días sin actividad): el workflow
   [`.github/workflows/keepalive.yml`](.github/workflows/keepalive.yml) lee la URL y la clave anon de `js/config.js`,
   consulta la base de datos cada 3 días y se reactiva a sí mismo para que GitHub no desactive el cron tras 60 días sin
   commits. No necesita secrets. Puedes lanzarlo a mano en **Actions → Supabase keep-alive → Run workflow**.

Nota: como cualquier ranking que se envía desde el navegador, alguien con conocimientos podría enviar una puntuación
falsa (dentro de los rangos válidos). Para un ranking entre amigos es suficiente.

## Añadir un mazo

1. Crea `js/decks/<id>/deck.js` exportando por defecto:
   ```js
   export default {
     id: 'mi-mazo',
     name: 'Mi mazo',
     description: 'Texto corto para la pantalla de mazos.',
     palette: { swirl: ['#color1', '#color2', '#color3'], accent: '#color' }, // fondo animado y realce
     labels: { monster: 'Monstruo', weapon: 'Arma', potion: 'Poción' },
     face(card) { return '<svg …>…</svg>'; }, // card = { id, suit: S|C|D|H, rank: 2..14, value, type }
     back() { return '<svg …>…</svg>'; },
   };
   ```
   `face` y `back` pueden devolver cualquier HTML, p. ej. `<img src="js/decks/mi-mazo/img/S14.png">` si prefieres
   imágenes. Las utilidades de `js/decks/pixel.js` (marco, glifos de palo, sprites pixel) sirven para dibujar en SVG.
2. Impórtalo y añádelo a `DECKS` en [`js/decks/index.js`](js/decks/index.js).
3. Añade sus archivos a la lista `ASSETS` de `sw.js` para que funcione offline.

Aparecerá en **Mazos** y se puede cambiar en cualquier momento (es puramente visual).

## Reglas implementadas

- 44 cartas: baraja de póker sin jokers ni J/Q/K/A rojos. ♠♣ monstruos (2–14), ♦ armas (2–10), ♥ pociones (2–10).
- 20 de vida, máximo 20.
- Sala de 4 cartas. Puedes huir (las 4 al fondo de la mazmorra) antes de tocar ninguna, nunca dos salas seguidas.
  Si te quedas, resuelves 3; la cuarta pasa a la siguiente sala.
- Arma: daño = monstruo − arma (mínimo 0). Una vez usada, solo sirve contra monstruos de valor **menor** que el último
  que mató (en Ajustes se puede elegir la variante **≤**). Siempre puedes luchar a mano.
- Solo la primera poción de cada sala cura.
- Puntuación: al ganar, la vida restante (+ el valor de la poción si acabas con 20 y la última carta fue una poción);
  al perder, la vida menos el valor de los monstruos que quedaban.

## Estructura

```
index.html, manifest.webmanifest, sw.js
css/style.css
js/engine/      motor de reglas puro (rules.js) y PRNG con semilla
js/ui/          mesa, controlador de partida, efectos, fondo WebGL
js/audio/       efectos y música sintetizados
js/decks/       mazos
supabase/       esquema SQL del ranking
tests/          tests del motor
tools/          generador de iconos (node tools/make-icons.mjs)
```

Scoundrel © Zach Gage & Kurt Bieg. Esta es una adaptación hecha por fans, sin afiliación.
