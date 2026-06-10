// data.jsx — Mock catalog for 3 example tenants. Exposes window.CE_DATA.
// Photos are Unsplash via stable photo IDs (CDN).

const img = (id, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

// ── Tenant 1 ── Tacos El Gordo (Mexican taqueria) ────────────────
const tacosEl = {
  id: 'tacos-el-gordo',
  slug: 'tacos-el-gordo',
  name: 'Tacos El Gordo',
  tagline: 'Tacos al pastor, suadero y campechanos hechos al carbón',
  themeClass: 'theme-tacos',
  whatsapp: '5215512345678',
  address: 'Av. Insurgentes Sur 432, Roma Nte., CDMX',
  rating: 4.8,
  reviewCount: 1247,
  deliveryMin: 25,
  deliveryFee: 35,
  hours: { open: 12, close: 23 },
  hero: img('1565299585323-38d6b0865b47', 1200),
  logoMonogram: 'TG',
  socials: { ig: 'tacoselgordo', fb: 'tacoselgordoMX', tt: 'tacoselgordo' },
  categories: [
    { id: 'promos', name: 'Promos', icon: 'fa-tag' },
    { id: 'tacos', name: 'Tacos', icon: 'fa-pepper-hot' },
    { id: 'gringas', name: 'Gringas', icon: 'fa-cheese' },
    { id: 'extras', name: 'Extras', icon: 'fa-bowl-food' },
    { id: 'bebidas', name: 'Bebidas', icon: 'fa-bottle-water' },
    { id: 'postres', name: 'Postres', icon: 'fa-ice-cream' },
  ],
  products: [
    { id: 'p1', cat: 'tacos', name: 'Taco al Pastor', desc: 'Cerdo marinado al trompo, piña, cebolla y cilantro', price: 28, photo: img('1599974579688-8dbdd335c77f'), tag: 'Más pedido', available: true,
      extras: [
        { group: 'Tortilla', kind: 'one', required: true, items: [{ id: 'maiz', name: 'Maíz', price: 0 }, { id: 'harina', name: 'Harina', price: 5 }] },
        { group: 'Salsas', kind: 'many', items: [{ id: 's1', name: 'Verde tatemada', price: 0 }, { id: 's2', name: 'Roja molcajeteada', price: 0 }, { id: 's3', name: 'Habanero', price: 0 }] },
        { group: 'Extras', kind: 'many', items: [{ id: 'q', name: 'Queso fundido', price: 12 }, { id: 'g', name: 'Guacamole', price: 18 }, { id: 'a', name: 'Aguacate', price: 10 }] },
      ] },
    { id: 'p2', cat: 'tacos', name: 'Taco de Suadero', desc: 'Suadero confitado en su propia grasa, cebolla, cilantro', price: 26, photo: img('1551504734-5ee1c4a1479b'), available: true },
    { id: 'p3', cat: 'tacos', name: 'Taco Campechano', desc: 'Mezcla de chorizo y bistec, con queso opcional', price: 32, photo: img('1565299543923-37dd37887442'), tag: 'Picante', available: true },
    { id: 'p4', cat: 'gringas', name: 'Gringa al Pastor', desc: 'Doble tortilla de harina, pastor, queso gratinado, piña', price: 78, photo: img('1604467794349-0b74285de7e7'), available: true },
    { id: 'p5', cat: 'gringas', name: 'Quesadilla Suadero', desc: 'Tortilla de harina con queso Oaxaca y suadero', price: 65, photo: img('1633504581786-316c8002b1b9'), available: false },
    { id: 'p6', cat: 'extras', name: 'Guacamole con totopos', desc: 'Aguacate, jitomate, cilantro, limón y chile serrano', price: 55, photo: img('1541544181051-e46607bc22a4'), available: true },
    { id: 'p7', cat: 'extras', name: 'Frijoles charros', desc: 'Frijoles bayos con tocino, chorizo y chiles toreados', price: 45, photo: img('1543339308-43e59d6b73a6'), available: true },
    { id: 'p8', cat: 'bebidas', name: 'Agua de Horchata', desc: 'Receta de la casa, canela y vainilla', price: 35, photo: img('1572213426852-0e4ed8f41ed2'), available: true },
    { id: 'p9', cat: 'bebidas', name: 'Coca Cola de vidrio', desc: '355 ml, bien fría', price: 28, photo: img('1622483767028-3f66f32aef97'), available: true },
    { id: 'p10', cat: 'postres', name: 'Churros con cajeta', desc: '6 piezas, azúcar canela y cajeta quemada', price: 48, photo: img('1624374797037-c104b1f04ca5'), available: true },
  ],
  promos: [
    { id: 'pr1', title: '3x2 en tacos al pastor', sub: 'De lunes a jueves, de 14 a 18 hrs', cover: img('1599974579688-8dbdd335c77f'), badge: 'Oferta del día' },
    { id: 'pr2', title: 'Combo familiar — 12 tacos + 2 aguas', sub: 'Por solo $349', cover: img('1604467794349-0b74285de7e7'), badge: 'Combo' },
  ],
  reviews: [
    { name: 'Alejandra V.', rating: 5, when: 'Hace 2 días', text: 'El pastor es de los mejores de la Roma. Llegó caliente y con todos los extras.' },
    { name: 'Mauricio O.', rating: 5, when: 'Hace 1 semana', text: 'Las gringas se vuelven adictivas. La salsa habanero está brutal.' },
    { name: 'Daniela S.', rating: 4, when: 'Hace 2 semanas', text: 'Riquísimo, aunque la entrega tardó un poco más de lo prometido.' },
  ],
};

// ── Tenant 2 ── Pizza Bambino (wood-fire Neapolitan) ──────────────
const pizza = {
  id: 'pizza-bambino',
  slug: 'pizza-bambino',
  name: 'Pizza Bambino',
  tagline: 'Pizza napolitana de leña, fermentación 72h',
  themeClass: 'theme-pizza',
  whatsapp: '5215587654321',
  address: 'Calle Orizaba 87, Roma Nte., CDMX',
  rating: 4.9,
  reviewCount: 832,
  deliveryMin: 30,
  deliveryFee: 45,
  hours: { open: 13, close: 23 },
  hero: img('1604068549290-dea0e4a305ca', 1200),
  logoMonogram: 'PB',
  socials: { ig: 'pizzabambino', fb: 'pizzabambinoMX' },
  categories: [
    { id: 'promos', name: 'Promos', icon: 'fa-tag' },
    { id: 'pizzas', name: 'Pizzas', icon: 'fa-pizza-slice' },
    { id: 'pastas', name: 'Pastas', icon: 'fa-utensils' },
    { id: 'ensaladas', name: 'Ensaladas', icon: 'fa-leaf' },
    { id: 'bebidas', name: 'Bebidas', icon: 'fa-wine-glass' },
    { id: 'postres', name: 'Postres', icon: 'fa-cake-candles' },
  ],
  products: [
    { id: 'b1', cat: 'pizzas', name: 'Margherita', desc: 'San Marzano DOP, fior di latte, albahaca fresca, aceite de oliva', price: 220, photo: img('1574071318508-1cdbab80d002'), tag: 'Clásica', available: true,
      extras: [
        { group: 'Tamaño', kind: 'one', required: true, items: [{ id: 'm', name: 'Mediana 30cm', price: 0 }, { id: 'g', name: 'Grande 36cm', price: 75 }] },
        { group: 'Toppings', kind: 'many', items: [{ id: 'b', name: 'Burrata fresca', price: 65 }, { id: 'p', name: 'Prosciutto', price: 55 }, { id: 'r', name: 'Rúcula', price: 25 }] },
      ] },
    { id: 'b2', cat: 'pizzas', name: 'Bambino Special', desc: 'Salami picante, miel de trufa, fior di latte, parmesano', price: 285, photo: img('1565299624946-b28f40a0ae38'), tag: 'Más pedida', available: true },
    { id: 'b3', cat: 'pizzas', name: 'Quattro Formaggi', desc: 'Mozzarella, gorgonzola, parmesano, taleggio', price: 265, photo: img('1513104890138-7c749659a591'), available: true },
    { id: 'b4', cat: 'pastas', name: 'Cacio e Pepe', desc: 'Tonnarelli al huevo, pecorino romano, pimienta negra', price: 195, photo: img('1551183053-bf91a1d81141'), available: true },
    { id: 'b5', cat: 'pastas', name: 'Carbonara', desc: 'Guanciale, yema de huevo, pecorino romano, pimienta', price: 215, photo: img('1612874742237-6526221588e3'), available: true },
    { id: 'b6', cat: 'ensaladas', name: 'Caprese di Bufala', desc: 'Mozzarella de búfala, jitomate cherry, albahaca, aceite de Liguria', price: 175, photo: img('1607532941433-304659e8198a'), available: true },
    { id: 'b7', cat: 'bebidas', name: 'Limonada de Sicilia', desc: 'Limón siciliano, romero y agua mineral', price: 65, photo: img('1556881286-fc6915169721'), available: true },
    { id: 'b8', cat: 'bebidas', name: 'Copa de Chianti', desc: 'Chianti Classico DOCG, 150 ml', price: 145, photo: img('1510812431401-41d2bd2722f3'), available: true },
    { id: 'b9', cat: 'postres', name: 'Tiramisú', desc: 'Mascarpone, café espresso, cacao Valrhona', price: 95, photo: img('1571877227200-a0d98ea607e9'), available: true },
  ],
  promos: [
    { id: 'br1', title: '2 pizzas medianas + botella de vino', sub: '$549 — viernes y sábados', cover: img('1604068549290-dea0e4a305ca'), badge: 'Fin de semana' },
  ],
  reviews: [
    { name: 'Federico P.', rating: 5, when: 'Hace 3 días', text: 'La Margherita es lo más cercano a Nápoles que he probado en CDMX.' },
    { name: 'Sofia A.', rating: 5, when: 'Hace 1 semana', text: 'La masa fermentada se nota. La burrata de toppings es un must.' },
  ],
};

// ── Tenant 3 ── Café Aurora (specialty coffee & pastry) ─────────────
const cafe = {
  id: 'cafe-aurora',
  slug: 'cafe-aurora',
  name: 'Café Aurora',
  tagline: 'Café de especialidad y panadería de origen',
  themeClass: 'theme-cafe',
  whatsapp: '5215599887766',
  address: 'Av. Álvaro Obregón 230, Roma Nte., CDMX',
  rating: 4.7,
  reviewCount: 564,
  deliveryMin: 20,
  deliveryFee: 30,
  hours: { open: 7, close: 21 },
  hero: img('1495474472287-4d71bcdd2085', 1200),
  logoMonogram: 'CA',
  socials: { ig: 'cafeauroramx' },
  categories: [
    { id: 'cafe', name: 'Café', icon: 'fa-mug-hot' },
    { id: 'matcha', name: 'Matcha', icon: 'fa-leaf' },
    { id: 'pan', name: 'Panadería', icon: 'fa-bread-slice' },
    { id: 'desayuno', name: 'Desayunos', icon: 'fa-egg' },
    { id: 'postres', name: 'Postres', icon: 'fa-cookie-bite' },
  ],
  products: [
    { id: 'c1', cat: 'cafe', name: 'Latte', desc: 'Espresso doble + leche texturizada, 240 ml', price: 65, photo: img('1509042239860-f550ce710b93'), available: true,
      extras: [
        { group: 'Tipo de leche', kind: 'one', required: true, items: [{ id: 'e', name: 'Entera', price: 0 }, { id: 'd', name: 'Deslactosada', price: 5 }, { id: 'a', name: 'Almendra', price: 15 }, { id: 'av', name: 'Avena', price: 15 }] },
        { group: 'Sabor', kind: 'one', items: [{ id: 'sin', name: 'Sin sabor', price: 0 }, { id: 'v', name: 'Vainilla', price: 10 }, { id: 'ca', name: 'Caramelo', price: 10 }] },
      ] },
    { id: 'c2', cat: 'cafe', name: 'Flat White', desc: 'Espresso doble, microfoam de leche entera', price: 60, photo: img('1517256064527-09c73fc73e38'), tag: 'House pick', available: true },
    { id: 'c3', cat: 'cafe', name: 'Cold Brew', desc: 'Café extraído en frío 18 hrs, vaso de 350 ml', price: 70, photo: img('1461023058943-07fcbe16d735'), available: true },
    { id: 'c4', cat: 'matcha', name: 'Matcha Latte', desc: 'Matcha ceremonial de Uji + leche al vapor', price: 85, photo: img('1545518514-ce8448f542b3'), available: true },
    { id: 'c5', cat: 'pan', name: 'Croissant de mantequilla', desc: 'Hojaldrado en casa, mantequilla francesa', price: 45, photo: img('1555507036-ab1f4038808a'), available: true },
    { id: 'c6', cat: 'pan', name: 'Pain au chocolat', desc: 'Chocolate Valrhona 70%', price: 52, photo: img('1623334044303-241021148842'), available: true },
    { id: 'c7', cat: 'desayuno', name: 'Avocado Toast', desc: 'Pan de masa madre, aguacate, huevo poché, semillas', price: 135, photo: img('1541519227354-08fa5d50c44d'), available: true },
    { id: 'c8', cat: 'postres', name: 'Cheesecake de maracuyá', desc: 'Base de galleta, queso crema, coulis de maracuyá', price: 95, photo: img('1551024506-0bccd828d307'), available: true },
  ],
  promos: [
    { id: 'cr1', title: 'Latte + croissant — $95', sub: 'Cada mañana antes de 11 hrs', cover: img('1509042239860-f550ce710b93'), badge: 'Mañanero' },
  ],
  reviews: [
    { name: 'Renata C.', rating: 5, when: 'Hace 4 días', text: 'El matcha es legítimamente ceremonial. Y los croissants, otro nivel.' },
    { name: 'Iván M.', rating: 5, when: 'Hace 1 semana', text: 'Mi cafetería favorita del barrio. El cold brew con avena es perfecto.' },
  ],
};

// ── Tenant 4 ── Dulces Lucía (postres mexicanos y repostería) ───────
const dulces = {
  id: 'dulces-lucia',
  slug: 'dulces-lucia',
  name: 'Dulces Lucía',
  tagline: 'Postres caseros, pan dulce y repostería mexicana',
  themeClass: 'theme-dulces',
  whatsapp: '5215566778899',
  address: 'Av. Álvaro Obregón 178, Roma Nte., CDMX',
  rating: 4.9,
  reviewCount: 1893,
  deliveryMin: 25,
  deliveryFee: 30,
  hours: { open: 9, close: 22 },
  hero: img('1488477181946-6428a0291777', 1200),
  logoMonogram: 'DL',
  socials: { ig: 'dulces.lucia', fb: 'dulceslucia.cdmx', tt: 'dulceslucia' },
  categories: [
    { id: 'promos', name: 'Promos', icon: 'fa-tag' },
    { id: 'pasteles', name: 'Pasteles', icon: 'fa-cake-candles' },
    { id: 'reposteria', name: 'Repostería', icon: 'fa-cookie-bite' },
    { id: 'tradicional', name: 'Tradicional', icon: 'fa-bread-slice' },
    { id: 'fríos', name: 'Fríos', icon: 'fa-ice-cream' },
    { id: 'bebidas', name: 'Bebidas', icon: 'fa-mug-hot' },
  ],
  products: [
    { id: 'd1', cat: 'pasteles', name: 'Pastel de Tres Leches', desc: 'Bizcocho bañado en tres leches, chantilly y canela', price: 95, photo: img('1565958011703-44f9829ba187'), tag: 'Más pedido', available: true,
      extras: [
        { group: 'Tamaño', kind: 'one', required: true, items: [{ id: 'reb', name: 'Rebanada', price: 0 }, { id: 'med', name: 'Medio pastel', price: 240 }, { id: 'ent', name: 'Pastel entero', price: 480 }] },
        { group: 'Topping extra', kind: 'many', items: [{ id: 'fr', name: 'Fresas', price: 18 }, { id: 'ca', name: 'Cajeta', price: 12 }, { id: 'ch', name: 'Chispas de chocolate', price: 10 }] },
      ] },
    { id: 'd2', cat: 'pasteles', name: 'Cheesecake de Fresa', desc: 'Queso crema, base de galleta maría, mermelada de fresa casera', price: 110, photo: img('1551024506-0bccd828d307'), tag: 'Favorito', available: true },
    { id: 'd3', cat: 'pasteles', name: 'Carlota de Limón', desc: 'Galleta maría, leche condensada, jugo de limón y vainilla', price: 85, photo: img('1542826438-bd32f43d626f'), available: true },
    { id: 'd4', cat: 'pasteles', name: 'Pastel de Chocolate Belga', desc: 'Triple capa con ganache de chocolate 70% Valrhona', price: 125, photo: img('1578985545062-69928b1d9587'), available: true },
    { id: 'd5', cat: 'reposteria', name: 'Macarons (caja de 6)', desc: 'Pistache, frambuesa, chocolate, vainilla, limón y caramelo', price: 145, photo: img('1569864358642-9d1684040f43'), tag: 'Selección', available: true },
    { id: 'd6', cat: 'reposteria', name: 'Concha Rellena de Nutella', desc: 'Concha tradicional con relleno cremoso de avellana', price: 38, photo: img('1509440159596-0249088772ff'), available: true },
    { id: 'd7', cat: 'reposteria', name: 'Brownie con Helado', desc: 'Brownie caliente, helado de vainilla, salsa de chocolate', price: 78, photo: img('1606313564200-e75d5e30476c'), available: true },
    { id: 'd8', cat: 'tradicional', name: 'Flan Napolitano', desc: 'Receta de la abuela, bañado en caramelo quemado', price: 55, photo: img('1488477181946-6428a0291777'), tag: 'Casero', available: true },
    { id: 'd9', cat: 'tradicional', name: 'Churros con Cajeta', desc: '6 piezas recién hechas, azúcar canela y cajeta de Celaya', price: 65, photo: img('1624374797037-c104b1f04ca5'), available: true },
    { id: 'd10', cat: 'tradicional', name: 'Gelatina de Rompope', desc: 'Gelatina cremosa de leche, vainilla y rompope', price: 42, photo: img('1488477181946-6428a0291777'), available: true },
    { id: 'd11', cat: 'tradicional', name: 'Arroz con Leche', desc: 'Cremoso, con canela, pasitas y cáscara de naranja', price: 38, photo: img('1542826438-bd32f43d626f'), available: false },
    { id: 'd12', cat: 'fríos', name: 'Helado Artesanal (3 bolas)', desc: 'Sabores del día: vainilla, fresa, chocolate, mamey, cajeta', price: 72, photo: img('1501443762994-82bd5dace89a'), available: true,
      extras: [
        { group: 'Sabor 1', kind: 'one', required: true, items: [{ id: 'v', name: 'Vainilla', price: 0 }, { id: 'f', name: 'Fresa', price: 0 }, { id: 'c', name: 'Chocolate', price: 0 }, { id: 'm', name: 'Mamey', price: 0 }, { id: 'cj', name: 'Cajeta', price: 0 }] },
        { group: 'Toppings', kind: 'many', items: [{ id: 'sp', name: 'Chispas de colores', price: 8 }, { id: 'gr', name: 'Granola', price: 12 }, { id: 'nu', name: 'Nuez caramelizada', price: 15 }] },
      ] },
    { id: 'd13', cat: 'fríos', name: 'Paleta de Mango Enchilado', desc: 'Mango natural con chile Tajin, paleta de hielo', price: 35, photo: img('1488900128323-21503983a07e'), available: true },
    { id: 'd14', cat: 'bebidas', name: 'Chocolate Caliente', desc: 'Chocolate de Oaxaca batido a mano, canela y vainilla', price: 55, photo: img('1517578239113-b03992dcdd25'), available: true },
    { id: 'd15', cat: 'bebidas', name: 'Atole de Guayaba', desc: 'Atole tradicional preparado con guayaba natural', price: 38, photo: img('1517578239113-b03992dcdd25'), available: true },
  ],
  promos: [
    { id: 'dp1', title: '2 rebanadas + chocolate caliente — $185', sub: 'Domingos por la tarde', cover: img('1565958011703-44f9829ba187'), badge: 'Domingo dulce' },
    { id: 'dp2', title: 'Pastel completo con 24h — 15% off', sub: 'Pedidos para fiestas y celebraciones', cover: img('1578985545062-69928b1d9587'), badge: 'Fiestas' },
  ],
  reviews: [
    { name: 'Valeria H.', rating: 5, when: 'Hace 1 día', text: 'El tres leches sabe igualito al de mi abuela. Llegaron las fresas perfectas.' },
    { name: 'Diego M.', rating: 5, when: 'Hace 3 días', text: 'Los macarons están a nivel parís. El chocolate belga es pecaminoso.' },
    { name: 'Camila R.', rating: 5, when: 'Hace 1 semana', text: 'Pedí un pastel para el cumple de mi hija y la sorprendieron. Atención bellísima.' },
  ],
};

window.CE_DATA = {
  locales: [tacosEl, pizza, cafe, dulces],
  byId: { [tacosEl.id]: tacosEl, [pizza.id]: pizza, [cafe.id]: cafe, [dulces.id]: dulces },
};
