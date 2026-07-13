/* PEAK AUTO — SPA implementing PEAK AUTO.dc.html (hash routing: #/ , #/automobile , #/auto/<id>) */
(function () {
  'use strict';

  /* Supabase is the system of record (public read via anon key; admin writes via /admin.html) */
  var SB = window.PK_SB || {};
  var INV = { cars: [], featured: [] };
  var CARS = [], LIVE = [];
  function initData(inv) {
    INV = inv || { cars: [], featured: [] };
    CARS = (INV.cars || []).map(function (c) {
      var out = {};
      for (var k in c) out[k] = c[k];
      out.st = c.status || 'disponibil';
      return out;
    }).filter(function (c) { return c.st !== 'ascuns'; });
    /* LIVE = sellable stock for hero/featured/teaser curation; sold cars stay in inventory with an overlay */
    LIVE = CARS.filter(function (c) { return c.st !== 'vandut'; });
    computePools();
  }
  var PHONE_DISPLAY = '+373 61 249 999';
  var PHONE_TEL = 'tel:+37361249999';
  var WA = 'https://wa.me/37361249999';
  var IG_URL = 'https://instagram.com/peakauto.md';
  var EUR_MDL = 20.07;
  var CDN = 'https://i.simpalsmedia.com/999.md/BoardImages/';

  function img900(e) { return /^https?:/.test(e) ? e : (e.indexOf('/') !== -1 ? '/' + e : CDN + '900x900/' + e); }
  function img320(e) { return /^https?:/.test(e) ? e : (e.indexOf('/') !== -1 ? '/' + e : CDN + '320x240/' + e); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtEur(n) { return n.toLocaleString('ro-RO').replace(/ /g, '.') + ' €'; }
  function fmtNum(n) { return n.toLocaleString('ro-RO').replace(/ /g, ' '); }
  function monthly(price, downPct, term) {
    var p = price * (1 - downPct / 100), r = 0.09 / 12;
    var f = Math.pow(1 + r, term);
    return Math.round(p * r * f / (f - 1));
  }

  /* ---------- i18n ---------- */
  var T = {
    ro: {
      nav_cars: 'Automobile', nav_services: 'Servicii', nav_showroom: 'Showroom', nav_contact: 'Contact',
      hero_kicker: 'Peak Auto — Chișinău', hero_h1: 'Premium & business class.', hero_sub: 'Importate. Verificate. În Chișinău.',
      hero_cta: 'Explorează stocul',
      trust_years: 'Ani pe piață', trust_stock: 'Automobile în stoc', trust_sold: 'Automobile livrate', trust_ig: 'Urmăritori Instagram',
      stock_title: 'Stoc curent', stock_all: 'Vezi toate cele {n} →',
      story_tag: 'În prim-plan', story_ext_k: 'Exterior', story_int_k: 'Interior',
      story_ext_t: 'Prezență fără efort.', story_int_t: 'Liniște de business class.',
      story_from: 'de la', story_mo: '€ / lună', story_lease: 'în leasing', story_cta: 'Vezi automobilul',
      how_title: 'Cum lucrăm',
      how1_t: 'Alegem și verificăm', how1_d: 'Fiecare automobil trece prin verificare de istoric — VIN, raport de istoric, inspecție tehnică independentă. Fără surprize.',
      how2_t: 'Import în 30–45 de zile', how2_d: 'Sursăm din licitații și dealeri autorizați din Europa și SUA. Transport asigurat, urmărire pe tot parcursul.',
      how3_t: 'Acte la cheie', how3_d: 'Vămuire, înmatriculare, garanție contractuală. Primești cheile unui automobil gata de drum, în Chișinău.',
      serv_credit_t: 'Credit & Leasing', serv_credit_d: 'Avans de la 20% · aprobare în 24–48h · bănci partenere din Moldova',
      serv_trade_t: 'Trade-In', serv_trade_d: 'Evaluare în aceeași zi · predai vechiul, pleci cu noul',
      serv_order_t: 'Auto la Comandă', serv_order_d: 'Specificația ta, sursată din UE/SUA · livrare în 30–45 de zile',
      show_title: 'Showroom Chișinău', show_addr_k: 'Adresă', show_addr_v: 'str. Grigore Ureche 64, Centru',
      show_prog_k: 'Program', show_prog_v: 'Lun–Sâm 09:00–19:00 · Duminică închis', show_tel_k: 'Telefon',
      show_dir: 'Indicații rutiere', show_write: 'Scrie-ne',
      ig_followers: '7.800+ urmăritori →',
      close_i: 'Mașina ta e deja în drum spre Chișinău.', close_h: 'Spune-ne ce cauți. De restul ne ocupăm noi.', close_wa: 'Scrie-ne pe WhatsApp',
      inv_kicker: 'Stoc verificat · Chișinău', inv_title: 'Automobile', inv_count: 'automobile în stoc',
      chip_all: 'Toate mărcile', chip_other: 'Alte mărci',
      f_body: 'Caroserie: toate', f_fuel: 'Combustibil: toate',
      sort_new: 'Cele mai recente', sort_pa: 'Preț crescător', sort_pd: 'Preț descrescător', sort_y: 'An fabricație',
      inv_empty: 'Niciun automobil nu corespunde filtrelor.', inv_reset: 'Resetează filtrele',
      back: '← Automobile',
      specs_title: 'Specificații',
      sg_motor: 'Motor & performanță', sg_state: 'Stare & istoric', sg_body: 'Caroserie', sg_reg: 'Înregistrare',
      k_power: 'Putere', k_engine: 'Motor', k_fuel: 'Combustibil', k_box: 'Cutie de viteze', k_drive: 'Tracțiune',
      k_year: 'An fabricație', k_km: 'Rulaj', k_state: 'Stare', k_avail: 'Disponibilitate',
      k_body: 'Tip', k_gen: 'Generație', k_seats: 'Locuri', k_doors: 'Uși', k_wheel: 'Volan',
      k_reg: 'Înmatriculare', k_origin: 'Origine', k_vin: 'VIN', k_author: 'Vânzător',
      desc_title: 'Descriere', see_999: 'Vezi anunțul pe 999.md →',
      equip_title: 'Dotări',
      hist_title: 'Istoric vehicul', hist_sub: 'verificat înainte de import', hist_badge: 'VIN transparent ✓',
      hist_1t: 'VIN public', hist_1d: 'verificabil independent', hist_2t: 'Origine: {v}', hist_2d: 'import direct',
      hist_3t: '{v}', hist_3d: 'înmatriculare', hist_4t: 'Rulaj declarat', hist_4d: '{v}',
      hist_cta: 'Solicită raportul complet',
      calc_title: 'Calculator finanțare', calc_sub: 'Estimare orientativă · leasing prin bănci partenere din Moldova',
      calc_down: 'Avans', calc_term: 'Perioadă', calc_months: 'luni', calc_out: 'Rata lunară estimată',
      calc_note: 'Dobândă orientativă 9% anual. Oferta finală aparține băncii partenere.',
      sim_title: 'Automobile similare',
      rail_from: 'de la', rail_mo: '€ / lună', rail_calc: 'calculează',
      rail_wa: 'Scrie pe WhatsApp', rail_call: 'Sună', rail_reserve: 'Rezervă acest automobil', rail_view: 'Programează o vizionare',
      rail_fine: 'Istoric verificat · VIN disponibil la cerere · Asistență vămuire și înmatriculare',
      wa_hi: 'Bună ziua! Mă interesează {car} ({year}).',
      wa_reserve: 'Vreau să rezerv {car}.', wa_view: 'Vreau să programez o vizionare pentru {car}.',
      wa_credit: 'Credit și leasing', wa_trade: 'Trade-In', wa_order: 'Auto la comandă', wa_report: 'Solicit raportul de istoric pentru {car}.',
      st_reserved: 'Rezervat', st_transit: 'În tranzit', st_sold: 'Vândut',
      search_ph: 'Caută model…', fav_chip: 'Favorite', share: 'Distribuie', share_ok: 'Link copiat ✓',
      feat_counter: 'din',
      xp_title: 'Explorează stocul', xp_brands: 'După marcă', xp_cats: 'După caroserie', xp_bands: 'După buget',
      cars_word: 'automobile', cat_suv: 'SUV & Crossover', cat_sedan: 'Sedan & Limuzină', cat_sport: 'Coupé & Cabrio',
      faq_title: 'Întrebări frecvente',
      faq1q: 'Cât durează un import la comandă?',
      faq1a: 'Între 30 și 45 de zile de la contract: sursare din UE/SUA, transport asigurat, vămuire și acte. Primești actualizări pe tot parcursul.',
      faq2q: 'Pot cumpăra în credit sau leasing?',
      faq2a: 'Da, lucrăm cu bănci partenere din Moldova. Avans de la 20%, aprobare în 24–48 de ore. Calculatorul de pe pagina fiecărui automobil îți dă o estimare orientativă.',
      faq3q: 'Acceptați trade-in?',
      faq3a: 'Da. Evaluăm mașina ta în aceeași zi, iar diferența o achiți cash, prin transfer sau în rate.',
      faq4q: 'Cum verificați automobilele?',
      faq4a: 'Istoric complet pe VIN, verificare de daune și rulaj, inspecție tehnică înainte de cumpărare. VIN-ul este public pe pagina fiecărui automobil, iar raportul complet îl primești la cerere.',
      faq5q: 'Unde vă găsesc?',
      faq5a: 'Showroom pe str. Grigore Ureche 64, în centrul Chișinăului. Luni–Sâmbătă 09:00–19:00. Scrie-ne pe WhatsApp sau sună oricând.',
      status_avail: 'Disponibil',
      ftr_about: 'Automobile premium și business class, importate și verificate. Showroom în centrul Chișinăului.',
      ftr_nav: 'Navigare', ftr_contact: 'Contact', ftr_hours: 'Lun–Sâm 09:00–19:00', ftr_sunday: 'Duminică închis',
      ftr_rights: '© 2026 Peak Development SRL. Toate drepturile rezervate.', ftr_vat: 'Prețuri în EUR · TVA inclus unde este cazul'
    },
    ru: {
      nav_cars: 'Автомобили', nav_services: 'Услуги', nav_showroom: 'Шоурум', nav_contact: 'Контакты',
      hero_kicker: 'Peak Auto — Кишинёв', hero_h1: 'Премиум и бизнес-класс.', hero_sub: 'Импортированы. Проверены. В Кишинёве.',
      hero_cta: 'Смотреть автомобили',
      trust_years: 'Лет на рынке', trust_stock: 'Автомобилей в наличии', trust_sold: 'Автомобилей продано', trust_ig: 'Подписчиков Instagram',
      stock_title: 'В наличии', stock_all: 'Смотреть все {n} →',
      story_tag: 'В центре внимания', story_ext_k: 'Экстерьер', story_int_k: 'Интерьер',
      story_ext_t: 'Присутствие без усилий.', story_int_t: 'Тишина бизнес-класса.',
      story_from: 'от', story_mo: '€ / месяц', story_lease: 'в лизинг', story_cta: 'Смотреть автомобиль',
      how_title: 'Как мы работаем',
      how1_t: 'Выбираем и проверяем', how1_d: 'Каждый автомобиль проходит проверку истории — VIN, отчёт истории, независимая техническая инспекция. Без сюрпризов.',
      how2_t: 'Импорт за 30–45 дней', how2_d: 'Закупаем на аукционах и у официальных дилеров Европы и США. Застрахованная перевозка, отслеживание на всём пути.',
      how3_t: 'Документы под ключ', how3_d: 'Растаможка, регистрация, договорная гарантия. Получаешь ключи от автомобиля, готового к дороге, в Кишинёве.',
      serv_credit_t: 'Кредит и лизинг', serv_credit_d: 'Аванс от 20% · одобрение за 24–48ч · банки-партнёры Молдовы',
      serv_trade_t: 'Trade-In', serv_trade_d: 'Оценка в тот же день · сдаёшь старый, уезжаешь на новом',
      serv_order_t: 'Авто под заказ', serv_order_d: 'Твоя спецификация из ЕС/США · доставка за 30–45 дней',
      show_title: 'Шоурум Кишинёв', show_addr_k: 'Адрес', show_addr_v: 'ул. Григоре Уреке 64, Центр',
      show_prog_k: 'График', show_prog_v: 'Пн–Сб 09:00–19:00 · Воскресенье закрыто', show_tel_k: 'Телефон',
      show_dir: 'Маршрут', show_write: 'Написать',
      ig_followers: '7.800+ подписчиков →',
      close_i: 'Твоя машина уже в пути в Кишинёв.', close_h: 'Скажи, что ищешь. Остальное — наша забота.', close_wa: 'Написать в WhatsApp',
      inv_kicker: 'Проверенный сток · Кишинёв', inv_title: 'Автомобили', inv_count: 'автомобилей в наличии',
      chip_all: 'Все марки', chip_other: 'Другие марки',
      f_body: 'Кузов: все', f_fuel: 'Топливо: все',
      sort_new: 'Сначала новые', sort_pa: 'Цена по возрастанию', sort_pd: 'Цена по убыванию', sort_y: 'Год выпуска',
      inv_empty: 'Ни один автомобиль не соответствует фильтрам.', inv_reset: 'Сбросить фильтры',
      back: '← Автомобили',
      specs_title: 'Характеристики',
      sg_motor: 'Двигатель и динамика', sg_state: 'Состояние и история', sg_body: 'Кузов', sg_reg: 'Регистрация',
      k_power: 'Мощность', k_engine: 'Двигатель', k_fuel: 'Топливо', k_box: 'Коробка передач', k_drive: 'Привод',
      k_year: 'Год выпуска', k_km: 'Пробег', k_state: 'Состояние', k_avail: 'Наличие',
      k_body: 'Тип', k_gen: 'Поколение', k_seats: 'Мест', k_doors: 'Дверей', k_wheel: 'Руль',
      k_reg: 'Регистрация', k_origin: 'Происхождение', k_vin: 'VIN', k_author: 'Продавец',
      desc_title: 'Описание', see_999: 'Смотреть объявление на 999.md →',
      equip_title: 'Комплектация',
      hist_title: 'История автомобиля', hist_sub: 'проверен до импорта', hist_badge: 'VIN прозрачен ✓',
      hist_1t: 'Открытый VIN', hist_1d: 'проверяется независимо', hist_2t: 'Происхождение: {v}', hist_2d: 'прямой импорт',
      hist_3t: '{v}', hist_3d: 'регистрация', hist_4t: 'Заявленный пробег', hist_4d: '{v}',
      hist_cta: 'Запросить полный отчёт',
      calc_title: 'Калькулятор финансирования', calc_sub: 'Ориентировочный расчёт · лизинг через банки-партнёры Молдовы',
      calc_down: 'Аванс', calc_term: 'Срок', calc_months: 'мес.', calc_out: 'Примерный платёж в месяц',
      calc_note: 'Ориентировочная ставка 9% годовых. Финальное предложение — за банком-партнёром.',
      sim_title: 'Похожие автомобили',
      rail_from: 'от', rail_mo: '€ / месяц', rail_calc: 'рассчитать',
      rail_wa: 'Написать в WhatsApp', rail_call: 'Позвонить', rail_reserve: 'Забронировать автомобиль', rail_view: 'Записаться на просмотр',
      rail_fine: 'История проверена · VIN по запросу · Помощь с растаможкой и регистрацией',
      wa_hi: 'Здравствуйте! Интересует {car} ({year}).',
      wa_reserve: 'Хочу забронировать {car}.', wa_view: 'Хочу записаться на просмотр {car}.',
      wa_credit: 'Кредит и лизинг', wa_trade: 'Trade-In', wa_order: 'Авто под заказ', wa_report: 'Прошу отчёт истории для {car}.',
      st_reserved: 'Бронь', st_transit: 'В пути', st_sold: 'Продано',
      search_ph: 'Поиск модели…', fav_chip: 'Избранное', share: 'Поделиться', share_ok: 'Ссылка скопирована ✓',
      feat_counter: 'из',
      xp_title: 'Исследуй сток', xp_brands: 'По марке', xp_cats: 'По кузову', xp_bands: 'По бюджету',
      cars_word: 'автомобилей', cat_suv: 'SUV и кроссоверы', cat_sedan: 'Седаны', cat_sport: 'Купе и кабрио',
      faq_title: 'Частые вопросы',
      faq1q: 'Сколько занимает импорт под заказ?',
      faq1a: 'От 30 до 45 дней с момента договора: подбор в ЕС/США, застрахованная перевозка, растаможка и документы. Держим в курсе на каждом этапе.',
      faq2q: 'Можно купить в кредит или лизинг?',
      faq2a: 'Да, работаем с банками-партнёрами Молдовы. Аванс от 20%, одобрение за 24–48 часов. Калькулятор на странице каждого автомобиля даст ориентировочный расчёт.',
      faq3q: 'Принимаете trade-in?',
      faq3a: 'Да. Оценим вашу машину в тот же день, разницу можно оплатить наличными, переводом или в рассрочку.',
      faq4q: 'Как вы проверяете автомобили?',
      faq4a: 'Полная история по VIN, проверка ДТП и пробега, техническая инспекция до покупки. VIN открыт на странице каждого автомобиля, полный отчёт - по запросу.',
      faq5q: 'Где вас найти?',
      faq5a: 'Шоурум на ул. Григоре Уреке 64, в центре Кишинёва. Понедельник–суббота 09:00–19:00. Пишите в WhatsApp или звоните.',
      status_avail: 'В наличии',
      ftr_about: 'Премиальные автомобили и бизнес-класс, импортированные и проверенные. Шоурум в центре Кишинёва.',
      ftr_nav: 'Навигация', ftr_contact: 'Контакты', ftr_hours: 'Пн–Сб 09:00–19:00', ftr_sunday: 'Воскресенье закрыто',
      ftr_rights: '© 2026 Peak Development SRL. Все права защищены.', ftr_vat: 'Цены в EUR · НДС включён где применимо'
    },
    en: {
      nav_cars: 'Cars', nav_services: 'Services', nav_showroom: 'Showroom', nav_contact: 'Contact',
      hero_kicker: 'Peak Auto — Chișinău', hero_h1: 'Premium & business class.', hero_sub: 'Imported. Verified. In Chișinău.',
      hero_cta: 'Explore the stock',
      trust_years: 'Years in business', trust_stock: 'Cars in stock', trust_sold: 'Cars delivered', trust_ig: 'Instagram followers',
      stock_title: 'Current stock', stock_all: 'View all {n} →',
      story_tag: 'In the spotlight', story_ext_k: 'Exterior', story_int_k: 'Interior',
      story_ext_t: 'Effortless presence.', story_int_t: 'Business-class silence.',
      story_from: 'from', story_mo: '€ / month', story_lease: 'on lease', story_cta: 'View the car',
      how_title: 'How we work',
      how1_t: 'We pick and verify', how1_d: 'Every car goes through a history check — VIN, history report, independent technical inspection. No surprises.',
      how2_t: 'Import in 30–45 days', how2_d: 'Sourced from auctions and authorized dealers across Europe and the US. Insured transport, tracked all the way.',
      how3_t: 'Turn-key paperwork', how3_d: 'Customs, registration, contractual warranty. You get the keys to a road-ready car, in Chișinău.',
      serv_credit_t: 'Credit & Leasing', serv_credit_d: 'Down payment from 20% · approval in 24–48h · partner banks in Moldova',
      serv_trade_t: 'Trade-In', serv_trade_d: 'Same-day valuation · hand over the old one, drive off in the new one',
      serv_order_t: 'Car on Order', serv_order_d: 'Your spec, sourced from EU/US · delivery in 30–45 days',
      show_title: 'Showroom Chișinău', show_addr_k: 'Address', show_addr_v: '64 Grigore Ureche St, Center',
      show_prog_k: 'Hours', show_prog_v: 'Mon–Sat 09:00–19:00 · Sunday closed', show_tel_k: 'Phone',
      show_dir: 'Directions', show_write: 'Message us',
      ig_followers: '7,800+ followers →',
      close_i: 'Your car is already on its way to Chișinău.', close_h: 'Tell us what you want. We handle the rest.', close_wa: 'Message us on WhatsApp',
      inv_kicker: 'Verified stock · Chișinău', inv_title: 'Cars', inv_count: 'cars in stock',
      chip_all: 'All makes', chip_other: 'Other makes',
      f_body: 'Body: all', f_fuel: 'Fuel: all',
      sort_new: 'Newest first', sort_pa: 'Price ascending', sort_pd: 'Price descending', sort_y: 'Year',
      inv_empty: 'No cars match the filters.', inv_reset: 'Reset filters',
      back: '← Cars',
      specs_title: 'Specifications',
      sg_motor: 'Engine & performance', sg_state: 'Condition & history', sg_body: 'Body', sg_reg: 'Registration',
      k_power: 'Power', k_engine: 'Engine', k_fuel: 'Fuel', k_box: 'Gearbox', k_drive: 'Drivetrain',
      k_year: 'Year', k_km: 'Mileage', k_state: 'Condition', k_avail: 'Availability',
      k_body: 'Type', k_gen: 'Generation', k_seats: 'Seats', k_doors: 'Doors', k_wheel: 'Steering',
      k_reg: 'Registration', k_origin: 'Origin', k_vin: 'VIN', k_author: 'Seller',
      desc_title: 'Description', see_999: 'View the listing on 999.md →',
      equip_title: 'Equipment',
      hist_title: 'Vehicle history', hist_sub: 'verified before import', hist_badge: 'Transparent VIN ✓',
      hist_1t: 'Public VIN', hist_1d: 'independently verifiable', hist_2t: 'Origin: {v}', hist_2d: 'direct import',
      hist_3t: '{v}', hist_3d: 'registration', hist_4t: 'Declared mileage', hist_4d: '{v}',
      hist_cta: 'Request the full report',
      calc_title: 'Finance calculator', calc_sub: 'Indicative estimate · leasing via partner banks in Moldova',
      calc_down: 'Down payment', calc_term: 'Term', calc_months: 'months', calc_out: 'Estimated monthly payment',
      calc_note: 'Indicative 9% annual rate. The final offer belongs to the partner bank.',
      sim_title: 'Similar cars',
      rail_from: 'from', rail_mo: '€ / month', rail_calc: 'calculate',
      rail_wa: 'Message on WhatsApp', rail_call: 'Call', rail_reserve: 'Reserve this car', rail_view: 'Book a viewing',
      rail_fine: 'History verified · VIN on request · Customs and registration assistance',
      wa_hi: 'Hello! I am interested in {car} ({year}).',
      wa_reserve: 'I want to reserve {car}.', wa_view: 'I want to book a viewing for {car}.',
      wa_credit: 'Credit & leasing', wa_trade: 'Trade-In', wa_order: 'Car on order', wa_report: 'Requesting the history report for {car}.',
      st_reserved: 'Reserved', st_transit: 'In transit', st_sold: 'Sold',
      search_ph: 'Search model…', fav_chip: 'Saved', share: 'Share', share_ok: 'Link copied ✓',
      feat_counter: 'of',
      xp_title: 'Explore the stock', xp_brands: 'By make', xp_cats: 'By body style', xp_bands: 'By budget',
      cars_word: 'cars', cat_suv: 'SUV & Crossover', cat_sedan: 'Sedans', cat_sport: 'Coupés & convertibles',
      faq_title: 'Frequently asked questions',
      faq1q: 'How long does an import on order take?',
      faq1a: '30 to 45 days from contract: sourcing in the EU/US, insured transport, customs and paperwork. You get updates the whole way.',
      faq2q: 'Can I buy on credit or leasing?',
      faq2a: 'Yes, we work with partner banks in Moldova. Down payment from 20%, approval in 24–48 hours. The calculator on every car page gives you an indicative estimate.',
      faq3q: 'Do you accept trade-ins?',
      faq3a: 'Yes. We value your car the same day; the difference can be paid in cash, by transfer, or in instalments.',
      faq4q: 'How do you verify the cars?',
      faq4a: 'Full VIN history, damage and mileage checks, technical inspection before purchase. The VIN is public on every car page and the full report is available on request.',
      faq5q: 'Where do I find you?',
      faq5a: 'Showroom at 64 Grigore Ureche St, central Chișinău. Monday–Saturday 09:00–19:00. Message us on WhatsApp or call any time.',
      status_avail: 'Available',
      ftr_about: 'Premium and business-class cars, imported and verified. Showroom in central Chișinău.',
      ftr_nav: 'Navigate', ftr_contact: 'Contact', ftr_hours: 'Mon–Sat 09:00–19:00', ftr_sunday: 'Sunday closed',
      ftr_rights: '© 2026 Peak Development SRL. All rights reserved.', ftr_vat: 'Prices in EUR · VAT included where applicable'
    }
  };

  /* value translations (999.md feature values are Romanian) */
  var VAL = {
    ru: {
      'Benzină': 'Бензин', 'Diesel': 'Дизель', 'Dizel': 'Дизель', 'Electricitate': 'Электро',
      'Hibrid': 'Гибрид', 'Plagin-hibrid (benzină)': 'Плагин-гибрид (бензин)', 'Plagin-hibrid (diesel)': 'Плагин-гибрид (дизель)',
      'Hibrid (benzină)': 'Гибрид (бензин)', 'Hibrid (diesel)': 'Гибрид (дизель)', 'Gaz/Benzină': 'Газ/Бензин',
      'Automată': 'Автомат', 'Mecanică': 'Механика', 'Robotizată': 'Робот', 'Variator': 'Вариатор',
      'Din față': 'Передний', 'Din spate': 'Задний', '4x4': '4x4',
      'Sedan': 'Седан', 'Crossover': 'Кроссовер', 'SUV': 'Внедорожник', 'Coupe': 'Купе', 'Cabriolet': 'Кабриолет',
      'Camionetă': 'Пикап', 'Universal': 'Универсал', 'Minivan': 'Минивэн', 'Hatchback': 'Хэтчбек',
      'Cu rulaj': 'С пробегом', 'Nou': 'Новый', 'Disponibil': 'В наличии', 'La comandă': 'Под заказ',
      'Republica Moldova': 'Республика Молдова', 'Zona Euro': 'Еврозона', 'SUA': 'США', 'Stânga': 'Левый', 'Dreapta': 'Правый',
      'Dealer auto': 'Автодилер'
    },
    en: {
      'Benzină': 'Petrol', 'Diesel': 'Diesel', 'Dizel': 'Diesel', 'Electricitate': 'Electric',
      'Hibrid': 'Hybrid', 'Plagin-hibrid (benzină)': 'Plug-in hybrid (petrol)', 'Plagin-hibrid (diesel)': 'Plug-in hybrid (diesel)',
      'Hibrid (benzină)': 'Hybrid (petrol)', 'Hibrid (diesel)': 'Hybrid (diesel)', 'Gaz/Benzină': 'LPG/Petrol',
      'Automată': 'Automatic', 'Mecanică': 'Manual', 'Robotizată': 'Automated manual', 'Variator': 'CVT',
      'Din față': 'FWD', 'Din spate': 'RWD', '4x4': '4x4',
      'Sedan': 'Sedan', 'Crossover': 'Crossover', 'SUV': 'SUV', 'Coupe': 'Coupé', 'Cabriolet': 'Convertible',
      'Camionetă': 'Pickup', 'Universal': 'Estate', 'Minivan': 'Minivan', 'Hatchback': 'Hatchback',
      'Cu rulaj': 'Used', 'Nou': 'New', 'Disponibil': 'Available', 'La comandă': 'On order',
      'Republica Moldova': 'Republic of Moldova', 'Zona Euro': 'Eurozone', 'SUA': 'USA', 'Stânga': 'Left', 'Dreapta': 'Right',
      'Dealer auto': 'Car dealer'
    }
  };

  /* ---------- state ---------- */
  var state = {
    lang: 'ro',
    route: { page: 'home', carId: null },
    brand: 'all', body: 'all', fuel: 'all', sort: 'new',
    bodyGroup: null, priceBand: null, q: '', favOnly: false,
    gi: 0, lb: false,
    calcDown: 30, calcTerm: 60
  };
  var skelTimer = null;
  var heroTimer = null;
  var featTimer = null;
  var featIdx = 0;

  function t(key) {
    var d = T[state.lang] || T.ro;
    return d[key] != null ? d[key] : (T.ro[key] != null ? T.ro[key] : key);
  }
  function tv(val) {
    if (state.lang === 'ro' || !val) return val;
    var m = VAL[state.lang];
    return (m && m[val]) || val;
  }
  function tf(key, repl) {
    var s = t(key);
    Object.keys(repl || {}).forEach(function (k) { s = s.replace('{' + k + '}', repl[k]); });
    return s;
  }

  /* ---------- curation pools (recomputed on every data refresh) ---------- */
  var byPrice, FLAGSHIP, TEASER, IG_CELLS, HERO_SLIDES, FEATURED;
  var makeCounts, TOP_MAKES, BODIES, FUELS, XP_MAKES, CATS, BANDS;
  function distinctMakeTop(n) {
    var seen = {}, out = [];
    for (var i = 0; i < byPrice.length && out.length < n; i++) {
      var c = byPrice[i];
      if (!seen[c.make]) { seen[c.make] = 1; out.push(c); }
    }
    return out;
  }
  function computePools() {
    byPrice = LIVE.slice().sort(function (a, b) { return b.price - a.price; });
    FLAGSHIP = byPrice[0];
    TEASER = distinctMakeTop(9);
    IG_CELLS = distinctMakeTop(5);
    /* hero rotates evergreen stock; the flagship tier lives in the featured spotlight */
    HERO_SLIDES = (function () {
    var seen = {}, out = [];
    for (var i = 0; i < byPrice.length && out.length < 5; i++) {
      var c = byPrice[i];
      if (c.id === FLAGSHIP.id || seen[c.make]) continue;
      seen[c.make] = 1; out.push(c);
    }
    return out;
    })();
    /* featured spotlight: admin-picked ids first, else top of the stock */
    FEATURED = (function () {
    var picked = (INV.featured || []).map(function (id) {
      return LIVE.filter(function (c) { return c.id === id; })[0];
    }).filter(Boolean);
    if (picked.length >= 2) return picked.slice(0, 6);
    return byPrice.slice(0, 4);
    })();

    makeCounts = {};
    LIVE.forEach(function (c) { makeCounts[c.make] = (makeCounts[c.make] || 0) + 1; });
    TOP_MAKES = Object.keys(makeCounts).sort(function (a, b) { return makeCounts[b] - makeCounts[a]; }).slice(0, 5);
    BODIES = Object.keys(CARS.reduce(function (m, c) { if (c.body) m[c.body] = 1; return m; }, {}));
    FUELS = Object.keys(CARS.reduce(function (m, c) { if (c.fuel) m[c.fuel] = 1; return m; }, {}));

    XP_MAKES = Object.keys(makeCounts).sort(function (a, b) { return makeCounts[b] - makeCounts[a]; }).slice(0, 6)
    .map(function (m) {
      var cars = LIVE.filter(function (c) { return c.make === m; });
      return { make: m, count: cars.length, minPrice: Math.min.apply(null, cars.map(function (c) { return c.price; })) };
    });
    CATS = [
    { key: 'suv', bodies: ['SUV', 'Crossover', 'Camionetă'] },
    { key: 'sedan', bodies: ['Sedan'] },
    { key: 'sport', bodies: ['Coupe', 'Cabriolet'] }
    ].map(function (g) {
    var cars = LIVE.filter(function (c) { return g.bodies.indexOf(c.body) !== -1; })
      .sort(function (a, b) { return b.price - a.price; });
    return { key: g.key, bodies: g.bodies, count: cars.length, img: cars.length ? cars[0].images[0] : null };
    }).filter(function (g) { return g.count > 0; });
    BANDS = [
    { min: 0, max: 40000, label: '< 40.000 €' },
    { min: 40000, max: 80000, label: '40–80.000 €' },
    { min: 80000, max: 150000, label: '80–150.000 €' },
    { min: 150000, max: Infinity, label: '150.000 € +' }
    ].map(function (b) {
    b.count = LIVE.filter(function (c) { return c.price >= b.min && c.price < b.max; }).length;
    return b;
    }).filter(function (b) { return b.count > 0; });
  }

  /* status presentation (design's badge system, driven by admin overrides) */
  var ST = {
    disponibil: { key: 'status_avail', dot: '#C8BFAE', badge: false },
    rezervat: { key: 'st_reserved', dot: '#C8BFAE', badge: true },
    tranzit: { key: 'st_transit', dot: '#F4F1EC', badge: true },
    vandut: { key: 'st_sold', dot: '#E10600', badge: false }
  };

  /* favorites (localStorage) */
  function getFavs() {
    try { return JSON.parse(localStorage.getItem('pk-favs') || '[]'); } catch (e) { return []; }
  }
  function toggleFav(id) {
    var f = getFavs(), i = f.indexOf(id);
    if (i === -1) f.push(id); else f.splice(i, 1);
    try { localStorage.setItem('pk-favs', JSON.stringify(f)); } catch (e) {}
    return f;
  }

  function carById(id) {
    for (var i = 0; i < CARS.length; i++) if (CARS[i].id === id) return CARS[i];
    return null;
  }
  function carMeta(c) {
    var parts = [c.year, fmtNum(c.km) + ' km'];
    if (c.power) parts.push(c.power + ' CP');
    else if (c.engine) parts.push(c.engine);
    return parts.join(' · ');
  }
  function waFor(key, c) {
    var txt = tf(key, { car: c ? c.name : '', year: c ? c.year : '' });
    return WA + '?text=' + encodeURIComponent(txt);
  }

  /* ---------- shared renderers ---------- */
  function cardHtml(c) {
    var st = ST[c.st] || ST.disponibil;
    var favs = getFavs();
    return '' +
      '<div class="car-card rv" data-car="' + esc(c.id) + '">' +
        '<div class="car-media">' +
          '<img src="' + esc(img900(c.images[0])) + '" srcset="' + esc(img320(c.images[0])) + ' 320w, ' + esc(img900(c.images[0])) + ' 900w" sizes="(max-width:640px) 96vw, (max-width:1100px) 46vw, 31vw" alt="' + esc(c.name) + '" loading="lazy" decoding="async">' +
          (st.badge ? '<div class="car-badge"><i style="background:' + st.dot + '"></i><span>' + t(st.key) + '</span></div>' : '') +
          (c.st === 'vandut' ? '<div class="car-sold"><span>' + t('st_sold') + '</span><i></i></div>' : '') +
          '<button class="fav' + (favs.indexOf(c.id) !== -1 ? ' on' : '') + '" data-fav="' + esc(c.id) + '" aria-label="Favorite">♥</button>' +
        '</div>' +
        '<div class="car-body">' +
          '<div class="car-row"><span class="car-name">' + esc(c.name) + '</span><span class="car-price">' + fmtEur(c.price) + '</span></div>' +
          '<div class="car-meta">' + esc(carMeta(c)) + '</div>' +
        '</div>' +
      '</div>';
  }
  function gridHtml(cars) {
    return '<div class="pk-cars">' + cars.map(cardHtml).join('') + '</div>';
  }

  /* ---------- home ---------- */
  function homeHtml() {
    var f = FLAGSHIP;
    var mo = monthly(f.price, 30, 60);
    return '' +
    '<div data-page="home">' +

    '<section class="hero grain">' +
      HERO_SLIDES.map(function (s, i) {
        return '<div class="hero-slide' + (i === 0 ? ' on' : '') + '" data-slide="' + i + '">' +
          '<img src="' + esc(img900(s.images[0])) + '" alt="' + esc(s.name) + '"' + (i > 0 ? ' loading="lazy"' : '') + '>' +
          '</div>';
      }).join('') +
      '<div class="hero-shade"></div>' +
      '<div class="hero-line"><div></div></div>' +
      '<div class="hero-foot">' +
        '<div class="hero-main">' +
          '<div class="hero-kicker">' + t('hero_kicker') + '</div>' +
          '<h1 class="hero-h1">' + t('hero_h1') + '</h1>' +
          '<p class="hero-sub">' + t('hero_sub') + '</p>' +
          '<div class="hero-ctas">' +
            '<button class="btn-red" data-nav="inventory">' + t('hero_cta') + ' <span style="font-weight:400">→</span></button>' +
            '<a class="btn-ghost" href="' + WA + '" target="_blank" rel="noopener">WhatsApp</a>' +
          '</div>' +
        '</div>' +
        '<div class="hero-car pk-hide-m">' +
          '<div class="hero-car-line"></div>' +
          '<div class="hero-car-name" id="pk-hcap-name">' + esc(HERO_SLIDES[0].name) + '</div>' +
          '<div class="hero-car-sub" id="pk-hcap-sub">' + esc(HERO_SLIDES[0].year + ' · ' + fmtEur(HERO_SLIDES[0].price)) + '</div>' +
        '</div>' +
      '</div>' +
    '</section>' +

    '<section class="trust">' +
      '<div class="trust-grid">' +
        '<div><div class="trust-num"><span data-tick="3">0</span>+</div><div class="trust-label">' + t('trust_years') + '</div></div>' +
        '<div><div class="trust-num"><span data-tick="' + CARS.length + '">0</span></div><div class="trust-label">' + t('trust_stock') + '</div></div>' +
        '<div><div class="trust-num"><span data-tick="500">0</span>+</div><div class="trust-label">' + t('trust_sold') + '</div></div>' +
        '<div><div class="trust-num"><span data-tick="7.8" data-dec="1">0</span>k</div><div class="trust-label">' + t('trust_ig') + '</div></div>' +
      '</div>' +
    '</section>' +

    '<section class="stock">' +
      '<div class="stock-head">' +
        '<div class="sec-head rv"><span class="sec-num">01</span><h2 class="sec-title">' + t('stock_title') + '</h2></div>' +
        '<a class="link-caps" href="/automobile" data-nav="inventory">' + tf('stock_all', { n: CARS.length }) + '</a>' +
      '</div>' +
      gridHtml(TEASER) +
    '</section>' +

    '<section class="xp">' +
      '<div class="sec-head rv"><span class="sec-num">02</span><h2 class="sec-title">' + t('xp_title') + '</h2></div>' +
      '<div class="xp-sub">' + t('xp_cats') + '</div>' +
      '<div class="cat-grid">' +
        CATS.map(function (g) {
          return '<div class="cat-card rv" data-catgo="' + esc(g.bodies.join('|')) + '">' +
            '<img src="' + esc(img900(g.img)) + '" alt="' + t('cat_' + g.key) + '" loading="lazy">' +
            '<div class="cap"><b>' + t('cat_' + g.key) + '</b><span>' + g.count + ' ' + t('cars_word') + ' →</span></div>' +
            '</div>';
        }).join('') +
      '</div>' +
      '<div class="xp-sub">' + t('xp_brands') + '</div>' +
      '<div class="xp-brands">' +
        XP_MAKES.map(function (m) {
          return '<div class="xp-brand rv" data-brandgo="' + esc(m.make) + '">' +
            '<b>' + esc(m.make) + '</b>' +
            '<span>' + m.count + ' ' + t('cars_word') + ' · ' + t('rail_from') + ' ' + fmtEur(m.minPrice) + '</span>' +
            '</div>';
        }).join('') +
      '</div>' +
      '<div class="xp-sub">' + t('xp_bands') + '</div>' +
      '<div class="band-row">' +
        BANDS.map(function (b, i) {
          return '<button class="band" data-bandgo="' + i + '">' + esc(b.label) + '<i>' + b.count + '</i></button>';
        }).join('') +
      '</div>' +
    '</section>' +

    '<section class="feat grain" id="pk-feat">' +
      FEATURED.map(function (c, i) {
        var cmo = monthly(c.price, 30, 60);
        return '<div class="feat-slide' + (i === 0 ? ' on' : '') + '" data-feat="' + i + '">' +
          '<img src="' + esc(img900(c.images[0])) + '" alt="' + esc(c.name) + '"' + (i > 0 ? ' loading="lazy"' : '') + ' decoding="async">' +
          '<div class="feat-shade"></div>' +
          '<div class="feat-cap">' +
            '<div class="feat-k">' + esc(c.year + (c.gen ? ' · ' + c.gen : '')) + '</div>' +
            '<h2 class="feat-name">' + esc(c.name) + '</h2>' +
            '<div class="feat-price">' + fmtEur(c.price) + ' <span>· ' + t('story_from') + ' ' + fmtNum(cmo) + ' ' + t('story_mo') + '</span></div>' +
            '<button class="btn-red" data-car="' + esc(c.id) + '">' + t('story_cta') + ' <span style="font-weight:400">→</span></button>' +
          '</div>' +
          '</div>';
      }).join('') +
      '<div class="feat-tag"><span class="sec-num">03</span><span>' + t('story_tag') + '</span></div>' +
      '<div class="feat-nav">' +
        '<span class="feat-count" id="pk-feat-count">1 ' + t('feat_counter') + ' ' + FEATURED.length + '</span>' +
        '<button id="pk-feat-prev" aria-label="Prev">←</button>' +
        '<button id="pk-feat-next" aria-label="Next">→</button>' +
      '</div>' +
      '<div class="feat-bar" id="pk-feat-bar"></div>' +
    '</section>' +

    '<section class="how" id="servicii">' +
      '<div class="sec-head rv"><span class="sec-num">04</span><h2 class="sec-title">' + t('how_title') + '</h2></div>' +
      '<div class="pk-steps">' +
        '<div class="step rv"><div class="step-num">01</div><h3>' + t('how1_t') + '</h3><p>' + t('how1_d') + '</p></div>' +
        '<div class="step rv"><div class="step-num">02</div><h3>' + t('how2_t') + '</h3><p>' + t('how2_d') + '</p></div>' +
        '<div class="step rv"><div class="step-num">03</div><h3>' + t('how3_t') + '</h3><p>' + t('how3_d') + '</p></div>' +
      '</div>' +
    '</section>' +

    '<section class="servs">' +
      '<a class="serv" href="' + WA + '?text=' + encodeURIComponent(t('wa_credit')) + '" target="_blank" rel="noopener">' +
        '<div><div class="serv-t">' + t('serv_credit_t') + '</div><div class="serv-d">' + t('serv_credit_d') + '</div></div>' +
        '<span class="serv-arrow">→</span></a>' +
      '<a class="serv" href="' + WA + '?text=' + encodeURIComponent(t('wa_trade')) + '" target="_blank" rel="noopener">' +
        '<div><div class="serv-t">' + t('serv_trade_t') + '</div><div class="serv-d">' + t('serv_trade_d') + '</div></div>' +
        '<span class="serv-arrow">→</span></a>' +
      '<a class="serv" href="' + WA + '?text=' + encodeURIComponent(t('wa_order')) + '" target="_blank" rel="noopener">' +
        '<div><div class="serv-t">' + t('serv_order_t') + '</div><div class="serv-d">' + t('serv_order_d') + '</div></div>' +
        '<span class="serv-arrow">→</span></a>' +
    '</section>' +

    '<section class="show" id="showroom">' +
      '<div>' +
        '<div class="sec-head rv"><span class="sec-num">05</span><h2 class="sec-title">' + t('show_title') + '</h2></div>' +
        '<div class="show-rows">' +
          '<div class="show-row"><span class="k">' + t('show_addr_k') + '</span><span class="v">' + t('show_addr_v') + '</span></div>' +
          '<div class="show-row"><span class="k">' + t('show_prog_k') + '</span><span class="v">' + t('show_prog_v') + '</span></div>' +
          '<div class="show-row"><span class="k">' + t('show_tel_k') + '</span><a class="v" href="' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a></div>' +
        '</div>' +
        '<div class="show-links">' +
          '<a class="link-under" href="https://maps.google.com/?q=Grigore+Ureche+64+Chisinau" target="_blank" rel="noopener">' + t('show_dir') + '</a>' +
          '<a class="link-under" href="' + WA + '" target="_blank" rel="noopener">' + t('show_write') + '</a>' +
        '</div>' +
      '</div>' +
      '<div class="mapbox">' +
        '<iframe src="https://maps.google.com/maps?q=Strada%20Grigore%20Ureche%2064%2C%20Chi%C8%99in%C4%83u%2C%20Moldova&z=16&output=embed" loading="lazy" title="Peak Auto — Grigore Ureche 64, Chișinău" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>' +
        '<div class="map-tag" style="pointer-events:none;left:18px;top:auto;bottom:46px;transform:none"><b>Peak Auto</b><span>Grigore Ureche 64</span></div>' +
      '</div>' +
    '</section>' +

    '<section class="faqs">' +
      '<div class="sec-head" style="margin-bottom:48px"><span class="sec-num">06</span><h2 class="sec-title">' + t('faq_title') + '</h2></div>' +
      [1, 2, 3, 4, 5].map(function (n) {
        return '<details class="faq"><summary>' + t('faq' + n + 'q') + '<span class="ind">+</span></summary><p>' + t('faq' + n + 'a') + '</p></details>';
      }).join('') +
    '</section>' +

    '<section class="ig">' +
      '<div class="ig-head">' +
        '<div class="sec-head rv"><span class="sec-num">07</span><h2 class="sec-title">@peakauto.md</h2></div>' +
        '<a class="link-caps" href="' + IG_URL + '" target="_blank" rel="noopener">' + t('ig_followers') + '</a>' +
      '</div>' +
      '<div class="ig-grid">' +
        IG_CELLS.map(function (c) {
          return '<a class="ig-cell" href="' + IG_URL + '" target="_blank" rel="noopener"><img src="' + esc(img900(c.images[0])) + '" alt="' + esc(c.name) + '" loading="lazy"></a>';
        }).join('') +
      '</div>' +
    '</section>' +

    '<section class="closing">' +
      '<p class="closing-i">' + t('close_i') + '</p>' +
      '<h2 class="closing-h">' + t('close_h') + '</h2>' +
      '<div class="closing-ctas">' +
        '<a class="btn-red" href="' + WA + '" target="_blank" rel="noopener">' + t('close_wa') + '</a>' +
        '<a class="btn-ghost" href="' + PHONE_TEL + '">' + PHONE_DISPLAY + '</a>' +
      '</div>' +
    '</section>' +

    '</div>';
  }

  /* ---------- inventory ---------- */
  function filteredCars() {
    var list = CARS.filter(function (c) {
      if (state.brand !== 'all') {
        if (state.brand === '__other') { if (TOP_MAKES.indexOf(c.make) !== -1) return false; }
        else if (c.make !== state.brand) return false;
      }
      if (state.bodyGroup && state.bodyGroup.indexOf(c.body) === -1) return false;
      if (state.body !== 'all' && c.body !== state.body) return false;
      if (state.fuel !== 'all' && c.fuel !== state.fuel) return false;
      if (state.priceBand && !(c.price >= state.priceBand[0] && c.price < state.priceBand[1])) return false;
      if (state.favOnly && getFavs().indexOf(c.id) === -1) return false;
      if (state.q) {
        var hay = (c.name + ' ' + c.gen + ' ' + c.body + ' ' + c.fuel + ' ' + c.year).toLowerCase();
        if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
      }
      return true;
    });
    if (state.sort === 'priceAsc') list = list.slice().sort(function (a, b) { return a.price - b.price; });
    else if (state.sort === 'priceDesc') list = list.slice().sort(function (a, b) { return b.price - a.price; });
    else if (state.sort === 'year') list = list.slice().sort(function (a, b) { return b.year - a.year; });
    return list;
  }

  function invHtml(loading) {
    var list = filteredCars();
    var chips = [{ v: 'all', l: t('chip_all') }]
      .concat(TOP_MAKES.map(function (m) { return { v: m, l: m }; }))
      .concat([{ v: '__other', l: t('chip_other') }]);
    var bodyOpts = '<option value="all">' + t('f_body') + '</option>' + BODIES.map(function (b) {
      return '<option value="' + esc(b) + '"' + (state.body === b ? ' selected' : '') + '>' + esc(tv(b)) + '</option>';
    }).join('');
    var fuelOpts = '<option value="all">' + t('f_fuel') + '</option>' + FUELS.map(function (fu) {
      return '<option value="' + esc(fu) + '"' + (state.fuel === fu ? ' selected' : '') + '>' + esc(tv(fu)) + '</option>';
    }).join('');
    var sortOpts = [['new', 'sort_new'], ['priceAsc', 'sort_pa'], ['priceDesc', 'sort_pd'], ['year', 'sort_y']].map(function (o) {
      return '<option value="' + o[0] + '"' + (state.sort === o[0] ? ' selected' : '') + '>' + t(o[1]) + '</option>';
    }).join('');

    var bodyHtml;
    if (loading) {
      var sk = '';
      for (var i = 0; i < 6; i++) sk += '<div style="background:#0A0A0B"><div class="sk-media"></div><div class="sk-body"><div class="sk-l1"></div><div class="sk-l2"></div></div></div>';
      bodyHtml = '<div class="pk-cars">' + sk + '</div>';
    } else if (!list.length) {
      bodyHtml = '<div class="inv-empty"><div class="inv-empty-t">' + t('inv_empty') + '</div>' +
        '<button class="btn-ghost" id="pk-reset" style="font-size:12px;padding:15px 28px">' + t('inv_reset') + '</button></div>';
    } else {
      bodyHtml = gridHtml(list);
    }

    return '' +
    '<div class="inv" data-page="inventory">' +
      '<section class="inv-head">' +
        '<div><div class="inv-kicker">' + t('inv_kicker') + '</div><h1 class="inv-h1">' + t('inv_title') + '</h1></div>' +
        '<div class="inv-count"><b>' + list.length + '</b> ' + t('inv_count') + '</div>' +
      '</section>' +
      '<div class="filters">' +
        '<input class="inv-q" id="pk-q" type="search" value="' + esc(state.q) + '" placeholder="' + t('search_ph') + '" aria-label="Search">' +
        '<div class="chips">' + chips.map(function (ch) {
          return '<button class="chip' + (state.brand === ch.v ? ' on' : '') + '" data-brand="' + esc(ch.v) + '">' + esc(ch.l) + '</button>';
        }).join('') +
        (getFavs().length ? '<button class="chip fav-chip' + (state.favOnly ? ' on' : '') + '" id="pk-favonly">♥ ' + t('fav_chip') + ' (' + getFavs().length + ')</button>' : '') +
        '</div>' +
        '<div class="filters-sel">' +
          '<select id="pk-f-body" aria-label="Body">' + bodyOpts + '</select>' +
          '<select id="pk-f-fuel" aria-label="Fuel">' + fuelOpts + '</select>' +
          '<select id="pk-f-sort" aria-label="Sort">' + sortOpts + '</select>' +
        '</div>' +
      '</div>' +
      '<section class="inv-grid">' + bodyHtml + '</section>' +
    '</div>';
  }

  /* ---------- car detail ---------- */
  function specRow(k, v) {
    if (!v) return '';
    return '<div class="spec-row"><span class="k">' + t(k) + '</span><span class="v">' + esc(tv(v)) + '</span></div>';
  }
  function carHtml(c) {
    var gal = c.images;
    var gi = Math.min(state.gi, gal.length - 1);
    var mo = monthly(c.price, 30, 60);
    var calcMo = monthly(c.price, state.calcDown, state.calcTerm);
    var mdl = Math.round(c.price * EUR_MDL / 1000) * 1000;

    var sim = LIVE.filter(function (x) { return x.id !== c.id && x.make === c.make; });
    if (sim.length < 3) sim = sim.concat(LIVE.filter(function (x) { return x.id !== c.id && x.make !== c.make && x.body === c.body; }));
    if (sim.length < 3) sim = sim.concat(LIVE.filter(function (x) { return x.id !== c.id && sim.indexOf(x) === -1; }));
    sim = sim.slice(0, 3);

    var equipHtml = c.equip && c.equip.length ? (
      '<div class="det-sec">' +
        '<h2 class="det-h2" style="margin-bottom:24px">' + t('equip_title') + '</h2>' +
        '<div class="equip-grid">' + c.equip.map(function (e) {
          return '<div class="equip-it"><i>—</i><span>' + esc(e) + '</span></div>';
        }).join('') + '</div>' +
      '</div>') : '';

    var proseHtml = c.prose ? (
      '<div class="det-sec">' +
        '<h2 class="det-h2">' + t('desc_title') + '</h2>' +
        '<div class="prose">' + esc(c.prose) + '</div>' +
        (c.url ? '<a class="link-under" style="display:inline-block;margin-top:22px" href="' + esc(c.url) + '" target="_blank" rel="noopener">' + t('see_999') + '</a>' : '') +
      '</div>') : '';

    return '' +
    '<div class="det" data-page="car">' +
      '<div class="det-back"><button data-nav="inventory">' + t('back') + '</button></div>' +
      '<div class="pk-detail">' +

        '<div style="min-width:0">' +
          '<div class="gal" id="pk-gal" style="--gal-bg:url(\'' + esc(img900(gal[gi])) + '\')">' +
            '<img class="gal-im show" id="pk-gal-a" src="' + esc(img900(gal[gi])) + '" alt="' + esc(c.name) + '" style="view-transition-name:car-hero" decoding="async">' +
            '<img class="gal-im" id="pk-gal-b" alt="" decoding="async">' +
            '<div class="gal-shade"></div>' +
            '<div class="gal-count" id="pk-gal-count">' + (gi + 1) + ' / ' + gal.length + '</div>' +
            '<button class="gal-nav prev" id="pk-prev" aria-label="Prev">←</button>' +
            '<button class="gal-nav next" id="pk-next" aria-label="Next">→</button>' +
          '</div>' +
          '<div class="pk-thumbs" id="pk-thumbs">' + gal.map(function (h, i) {
            return '<div class="thumb' + (i === gi ? ' on' : '') + '" data-gi="' + i + '"><img src="' + esc(img320(h)) + '" alt="" loading="lazy"></div>';
          }).join('') + '</div>' +

          '<div class="det-sec">' +
            '<h2 class="det-h2">' + t('specs_title') + '</h2>' +
            '<div class="pk-specs">' +
              '<div class="spec-grp"><div class="spec-grp-t">' + t('sg_motor') + '</div>' +
                (c.power ? specRow('k_power', c.power + ' CP') : '') +
                specRow('k_engine', c.engine) + specRow('k_fuel', c.fuel) + specRow('k_box', c.box) + specRow('k_drive', c.drive) +
              '</div>' +
              '<div class="spec-grp"><div class="spec-grp-t">' + t('sg_state') + '</div>' +
                specRow('k_year', String(c.year)) + specRow('k_km', fmtNum(c.km) + ' km') +
                specRow('k_state', c.stateRaw || 'Cu rulaj') + specRow('k_avail', c.avail) +
              '</div>' +
              '<div class="spec-grp"><div class="spec-grp-t">' + t('sg_body') + '</div>' +
                specRow('k_body', c.body) + specRow('k_gen', c.gen) + specRow('k_seats', c.seats) + specRow('k_doors', c.doors) + specRow('k_wheel', c.wheel) +
              '</div>' +
              '<div class="spec-grp"><div class="spec-grp-t">' + t('sg_reg') + '</div>' +
                specRow('k_reg', c.reg) + specRow('k_origin', c.origin) + specRow('k_vin', c.vin) + specRow('k_author', 'Dealer auto') +
              '</div>' +
            '</div>' +
          '</div>' +

          equipHtml +
          proseHtml +

          '<div class="hist">' +
            '<div class="hist-head">' +
              '<div><h2 class="det-h2" style="margin-bottom:10px">' + t('hist_title') + '</h2>' +
              '<div class="hist-sub">VIN ' + esc(c.vin || '—') + ' · ' + t('hist_sub') + '</div></div>' +
              '<div class="hist-badge">' + t('hist_badge') + '</div>' +
            '</div>' +
            '<div class="hist-grid">' +
              '<div class="hist-it"><b>' + t('hist_1t') + '</b><span>' + t('hist_1d') + '</span></div>' +
              '<div class="hist-it"><b>' + tf('hist_2t', { v: esc(tv(c.origin || '—')) }) + '</b><span>' + t('hist_2d') + '</span></div>' +
              '<div class="hist-it"><b>' + tf('hist_3t', { v: esc(tv(c.reg || '—')) }) + '</b><span>' + t('hist_3d') + '</span></div>' +
              '<div class="hist-it"><b>' + t('hist_4t') + '</b><span>' + tf('hist_4d', { v: fmtNum(c.km) + ' km' }) + '</span></div>' +
            '</div>' +
            '<a class="link-under" style="display:inline-block;margin-top:28px" href="' + waFor('wa_report', c) + '" target="_blank" rel="noopener">' + t('hist_cta') + '</a>' +
          '</div>' +

          '<div class="det-sec" id="calc">' +
            '<h2 class="det-h2">' + t('calc_title') + '</h2>' +
            '<div class="calc-sub">' + t('calc_sub') + '</div>' +
            '<div class="calc-grid">' +
              '<div class="calc-sliders">' +
                '<div>' +
                  '<div class="calc-lbl"><span class="k">' + t('calc_down') + '</span><span class="v"><span id="pk-down-pct">' + state.calcDown + '</span>% · <span id="pk-down-eur">' + fmtEur(Math.round(c.price * state.calcDown / 100)) + '</span></span></div>' +
                  '<input type="range" id="pk-r-down" min="10" max="70" step="5" value="' + state.calcDown + '" aria-label="Down payment">' +
                '</div>' +
                '<div>' +
                  '<div class="calc-lbl"><span class="k">' + t('calc_term') + '</span><span class="v"><span id="pk-term">' + state.calcTerm + '</span> ' + t('calc_months') + '</span></div>' +
                  '<input type="range" id="pk-r-term" min="12" max="84" step="12" value="' + state.calcTerm + '" aria-label="Term">' +
                '</div>' +
              '</div>' +
              '<div class="calc-out">' +
                '<div class="calc-out-k">' + t('calc_out') + '</div>' +
                '<div class="calc-out-v"><span id="pk-calc-mo">' + fmtNum(calcMo) + '</span> <span>' + t('rail_mo') + '</span></div>' +
                '<div class="calc-note">' + t('calc_note') + '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="det-sec" style="margin-top:80px">' +
            '<h2 class="det-h2" style="margin-bottom:32px">' + t('sim_title') + '</h2>' +
            gridHtml(sim) +
          '</div>' +
        '</div>' +

        '<div class="pk-rail">' +
          '<div class="rail-top">' +
            '<div class="rail-badge"><i style="background:' + (ST[c.st] || ST.disponibil).dot + '"></i><span>' + t((ST[c.st] || ST.disponibil).key) + '</span></div>' +
            '<div class="rail-acts">' +
              '<button class="ract fav-d' + (getFavs().indexOf(c.id) !== -1 ? ' on' : '') + '" data-fav="' + esc(c.id) + '" aria-label="Favorite">♥</button>' +
              '<button class="ract" id="pk-share" aria-label="Share">⇪</button>' +
            '</div>' +
          '</div>' +
          '<h1 class="rail-name">' + esc(c.name) + '</h1>' +
          '<div class="rail-meta">' + esc(carMeta(c) + ' · ' + tv(c.fuel)) + '</div>' +
          '<div class="rail-price">' + fmtEur(c.price) + '</div>' +
          '<div class="rail-mdl">≈ ' + fmtNum(mdl) + ' MDL</div>' +
          '<div class="rail-monthly">' + t('rail_from') + ' <b>' + fmtNum(mo) + ' ' + t('rail_mo') + '</b> · <a href="#calc">' + t('rail_calc') + '</a></div>' +
          '<div class="rail-hr"></div>' +
          '<div class="rail-col">' +
            '<a class="rail-btn-red" href="' + waFor('wa_hi', c) + '" target="_blank" rel="noopener">' + t('rail_wa') + '</a>' +
            '<a class="rail-btn" href="' + PHONE_TEL + '">' + t('rail_call') + '&nbsp;' + PHONE_DISPLAY + '</a>' +
            '<div class="rail-duo">' +
              '<a href="viber://chat?number=%2B37361249999">Viber</a>' +
              '<a href="' + IG_URL + '" target="_blank" rel="noopener">Instagram</a>' +
            '</div>' +
          '</div>' +
          '<div class="rail-hr"></div>' +
          '<div class="rail-col">' +
            '<a class="rail-btn sm" href="' + waFor('wa_reserve', c) + '" target="_blank" rel="noopener">' + t('rail_reserve') + '</a>' +
            '<a class="rail-btn sm" href="' + waFor('wa_view', c) + '" target="_blank" rel="noopener">' + t('rail_view') + '</a>' +
          '</div>' +
          '<div class="rail-fine">' + t('rail_fine') + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="pk-mbar">' +
        '<div class="mbar-info">' +
          '<div class="mbar-price">' + fmtEur(c.price) + '</div>' +
          '<div class="mbar-name">' + esc(c.name) + '</div>' +
        '</div>' +
        '<a class="mbar-call" href="' + PHONE_TEL + '">' + t('rail_call') + '</a>' +
        '<a class="mbar-wa" href="' + waFor('wa_hi', c) + '" target="_blank" rel="noopener">WhatsApp</a>' +
      '</div>' +
      '<div class="pk-mbar-spacer"></div>' +
    '</div>';
  }

  /* ---------- lightbox ---------- */
  function lbHtml(c) {
    var gal = c.images;
    var gi = Math.min(state.gi, gal.length - 1);
    return '' +
      '<div class="lb" id="pk-lb-in">' +
        '<img src="' + esc(img900(gal[gi])) + '" alt="' + esc(c.name) + '">' +
        '<button class="x" id="pk-lb-x" aria-label="Close">✕</button>' +
        '<button class="p" id="pk-lb-p" aria-label="Prev">←</button>' +
        '<button class="n" id="pk-lb-n" aria-label="Next">→</button>' +
        '<div class="lb-count">' + (gi + 1) + ' / ' + gal.length + '</div>' +
      '</div>';
  }
  function renderLb(isStep) {
    var host = document.getElementById('pk-lb');
    var c = state.route.page === 'car' && carById(state.route.carId);
    host.innerHTML = (state.lb && c) ? lbHtml(c) : '';
    if (state.lb && c && isStep) {
      var lbi = host.querySelector('.lb img');
      var lbBox = host.querySelector('.lb');
      if (lbBox) lbBox.style.animation = 'none';
      if (lbi && lbi.animate) lbi.animate([{ opacity: .3 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
    }
    document.body.style.overflow = (state.lb && c) ? 'hidden' : '';
    if (state.lb && c) {
      var lbEl = document.getElementById('pk-lb-in');
      var lt0 = null;
      lbEl.addEventListener('touchstart', function (e) { lt0 = e.touches[0].clientX; }, { passive: true });
      lbEl.addEventListener('touchend', function (e) {
        if (lt0 == null) return;
        var dx = e.changedTouches[0].clientX - lt0;
        lt0 = null;
        if (Math.abs(dx) > 42) stepImg(dx < 0 ? 1 : -1);
      }, { passive: true });
      lbEl.addEventListener('click', function (e) { if (e.target === this) closeLb(); });
      document.getElementById('pk-lb-x').addEventListener('click', closeLb);
      document.getElementById('pk-lb-p').addEventListener('click', function (e) { e.stopPropagation(); stepImg(-1); });
      document.getElementById('pk-lb-n').addEventListener('click', function (e) { e.stopPropagation(); stepImg(1); });
    }
  }
  function closeLb() { state.lb = false; renderLb(); }

  /* ---------- gallery ---------- */
  var galFront = 'a';
  function preloadNeighbors(c) {
    var n = c.images.length;
    [1, -1].forEach(function (d) {
      var im = new Image();
      im.src = img900(c.images[(state.gi + d + n) % n]);
    });
  }
  function stepImg(d) {
    var c = carById(state.route.carId);
    if (!c) return;
    var n = c.images.length;
    state.gi = (state.gi + d + n) % n;
    updateGallery(c, d);
    if (state.lb) renderLb(true);
  }
  function updateGallery(c, dir) {
    var cn = document.getElementById('pk-gal-count');
    if (cn) cn.textContent = (state.gi + 1) + ' / ' + c.images.length;
    var thumbs = document.querySelectorAll('#pk-thumbs .thumb');
    for (var i = 0; i < thumbs.length; i++) thumbs[i].classList.toggle('on', i === state.gi);
    var on = document.querySelector('#pk-thumbs .thumb.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });

    var A = document.getElementById('pk-gal-a'), B = document.getElementById('pk-gal-b');
    if (!A || !B) return;
    var front = galFront === 'a' ? A : B;
    var back = galFront === 'a' ? B : A;
    var src = img900(c.images[state.gi]);
    back.className = 'gal-im' + (dir < 0 ? ' from-left' : '');
    back.src = src;
    var swap = function () {
      // move the shared-element name onto the visible layer so back-nav morphs stay correct
      back.style.viewTransitionName = 'car-hero';
      front.style.viewTransitionName = '';
      back.classList.add('show');
      front.classList.remove('show');
      var galEl = document.getElementById('pk-gal');
      if (galEl) galEl.style.setProperty('--gal-bg', "url('" + src + "')");
      galFront = galFront === 'a' ? 'b' : 'a';
      preloadNeighbors(c);
    };
    if (back.decode) back.decode().then(swap).catch(swap);
    else (back.complete ? swap() : back.addEventListener('load', swap, { once: true }));
  }

  /* ---------- render root ---------- */
  function doRender(opts) {
    var view = document.getElementById('pk-view');
    var page = state.route.page;
    clearInterval(heroTimer);
    clearInterval(featTimer);
    if (page === 'home') view.innerHTML = homeHtml();
    else if (page === 'inventory') view.innerHTML = invHtml(!!(opts && opts.loading));
    else {
      var c = carById(state.route.carId);
      if (!c) { state.route = { page: 'inventory', carId: null }; view.innerHTML = invHtml(false); }
      else view.innerHTML = carHtml(c);
    }
    bindView();
    syncHeader();
    initTicks();
    initReveals();
    renderLb();
    if (page === 'home') { startHero(); startFeat(); }
    syncTitle();
  }

  function render(opts, vt) {
    if (vt && document.startViewTransition && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.startViewTransition(function () { doRender(opts); });
    } else {
      doRender(opts);
    }
  }

  function setMeta(desc) {
    var m = document.querySelector('meta[name="description"]');
    if (m && desc) m.setAttribute('content', desc);
    var canon = document.getElementById('pk-canon');
    if (!canon) {
      canon = document.createElement('link');
      canon.rel = 'canonical'; canon.id = 'pk-canon';
      document.head.appendChild(canon);
    }
    canon.href = location.origin + location.pathname;
  }
  function setJsonLd(id, obj) {
    var el = document.getElementById(id);
    if (!obj) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json'; el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(obj);
  }
  function syncTitle() {
    var base = 'PEAK AUTO';
    var page = state.route.page;
    if (page === 'car') {
      var c = carById(state.route.carId);
      if (c) {
        document.title = c.name + ' ' + c.year + ' — ' + fmtEur(c.price) + ' · ' + base;
        setMeta(c.name + ' ' + c.year + ', ' + fmtNum(c.km) + ' km, ' + tv(c.fuel) + ' — ' + fmtEur(c.price) + '. Verificat, în Chișinău la PEAK AUTO. ' + PHONE_DISPLAY + '.');
        setJsonLd('pk-ld-car', {
          '@context': 'https://schema.org',
          '@type': 'Car',
          name: c.name + ' ' + c.year,
          brand: { '@type': 'Brand', name: c.make },
          model: c.model,
          vehicleModelDate: String(c.year),
          mileageFromOdometer: { '@type': 'QuantitativeValue', value: c.km, unitCode: 'KMT' },
          fuelType: c.fuel,
          vehicleTransmission: c.box,
          vehicleIdentificationNumber: c.vin || undefined,
          image: (c.images || []).slice(0, 5).map(img900),
          offers: {
            '@type': 'Offer',
            price: c.price,
            priceCurrency: 'EUR',
            availability: c.st === 'vandut' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
            url: location.origin + '/auto/' + c.id
          }
        });
      }
    } else if (page === 'inventory') {
      document.title = t('inv_title') + ' (' + CARS.length + ') · ' + base;
      setMeta(CARS.length + ' automobile premium și business class în stoc la PEAK AUTO Chișinău. Mercedes, BMW, Porsche, Audi, Land Rover. Credit și leasing.');
      setJsonLd('pk-ld-car', null);
    } else {
      document.title = base + ' — Automobile premium în Chișinău';
      setMeta('PEAK AUTO — automobile premium și business class, importate și verificate. Showroom în centrul Chișinăului, str. Grigore Ureche 64. Credit, leasing, trade-in.');
      setJsonLd('pk-ld-car', null);
    }
  }
  /* dealer schema, once */
  setJsonLd('pk-ld-dealer', {
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    name: 'PEAK AUTO',
    legalName: 'Peak Development SRL',
    url: location.origin,
    telephone: '+37361249999',
    address: { '@type': 'PostalAddress', streetAddress: 'str. Grigore Ureche 64', addressLocality: 'Chișinău', addressCountry: 'MD' },
    openingHours: 'Mo-Sa 09:00-19:00',
    sameAs: ['https://instagram.com/peakauto.md', 'https://999.md/ro/profile/PEAKAUTO']
  });

  function stepFeat(d, manual) {
    var slides = document.querySelectorAll('.feat-slide');
    if (!slides.length) return;
    featIdx = (featIdx + d + slides.length) % slides.length;
    slides.forEach(function (s, i) { s.classList.toggle('on', i === featIdx); });
    var cnt = document.getElementById('pk-feat-count');
    if (cnt) cnt.textContent = (featIdx + 1) + ' ' + t('feat_counter') + ' ' + slides.length;
    var bar = document.getElementById('pk-feat-bar');
    if (bar) { bar.style.transition = 'none'; bar.style.width = '0%'; }
    if (manual) restartFeatTimer();
  }
  function restartFeatTimer() {
    clearInterval(featTimer);
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var t0 = Date.now(), DUR = 7000;
    featTimer = setInterval(function () {
      var p = (Date.now() - t0) / DUR;
      var bar = document.getElementById('pk-feat-bar');
      if (bar) { bar.style.transition = 'none'; bar.style.width = Math.min(100, p * 100) + '%'; }
      if (p >= 1) { t0 = Date.now(); stepFeat(1); }
    }, 100);
  }
  function startFeat() {
    featIdx = 0;
    restartFeatTimer();
  }

  function initReveals() {
    if (!('IntersectionObserver' in window)) return;
    var els = document.querySelectorAll('.rv:not(.rv-in)');
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('rv-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  function startHero() {
    var slides = document.querySelectorAll('.hero-slide');
    if (slides.length < 2) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var idx = 0;
    heroTimer = setInterval(function () {
      idx = (idx + 1) % slides.length;
      slides.forEach(function (s, i) { s.classList.toggle('on', i === idx); });
      var car = HERO_SLIDES[idx];
      var n = document.getElementById('pk-hcap-name'), s2 = document.getElementById('pk-hcap-sub');
      if (n) n.textContent = car.name;
      if (s2) s2.textContent = car.year + ' · ' + fmtEur(car.price);
    }, 6500);
  }

  function bindView() {
    var view = document.getElementById('pk-view');

    view.querySelectorAll('[data-car]').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        if (el._pf) return;
        el._pf = 1;
        var c = carById(el.getAttribute('data-car'));
        if (c && c.images && c.images[0]) { var im = new Image(); im.src = img900(c.images[0]); }
      }, { once: true });
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-fav]')) return;
        var im = el.querySelector('img');
        if (im && document.startViewTransition) im.style.viewTransitionName = 'car-hero';
        goto('car', el.getAttribute('data-car'));
      });
    });
    view.querySelectorAll('[data-fav]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        var favs = toggleFav(el.getAttribute('data-fav'));
        el.classList.toggle('on', favs.indexOf(el.getAttribute('data-fav')) !== -1);
        if (state.favOnly && !favs.length) state.favOnly = false;
      });
    });
    var fo = document.getElementById('pk-favonly');
    if (fo) fo.addEventListener('click', function () { state.favOnly = !state.favOnly; render(); });
    var q = document.getElementById('pk-q');
    if (q) {
      var qT = null;
      q.addEventListener('input', function () {
        clearTimeout(qT);
        qT = setTimeout(function () {
          state.q = q.value;
          render();
          var q2 = document.getElementById('pk-q');
          if (q2) { q2.focus(); q2.setSelectionRange(q2.value.length, q2.value.length); }
        }, 220);
      });
    }
    var shareBtn = document.getElementById('pk-share');
    if (shareBtn) shareBtn.addEventListener('click', function () {
      var c = carById(state.route.carId);
      var url = location.href;
      var done = function () { shareBtn.textContent = '✓'; setTimeout(function () { shareBtn.textContent = '⇪'; }, 1600); };
      if (navigator.share) navigator.share({ title: c ? c.name : 'PEAK AUTO', url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(done).catch(function () {});
    });
    var fPrev = document.getElementById('pk-feat-prev'), fNext = document.getElementById('pk-feat-next');
    if (fPrev) fPrev.addEventListener('click', function () { stepFeat(-1, true); });
    if (fNext) fNext.addEventListener('click', function () { stepFeat(1, true); });
    view.querySelectorAll('[data-nav]').forEach(bindNav);

    view.querySelectorAll('[data-brand]').forEach(function (el) {
      el.addEventListener('click', function () { state.brand = el.getAttribute('data-brand'); render(); });
    });
    view.querySelectorAll('[data-brandgo]').forEach(function (el) {
      el.addEventListener('click', function () {
        state.brand = el.getAttribute('data-brandgo');
        state.body = 'all'; state.bodyGroup = null; state.priceBand = null;
        goto('inventory');
      });
    });
    view.querySelectorAll('[data-catgo]').forEach(function (el) {
      el.addEventListener('click', function () {
        state.bodyGroup = el.getAttribute('data-catgo').split('|');
        state.body = 'all'; state.brand = 'all'; state.priceBand = null;
        goto('inventory');
      });
    });
    view.querySelectorAll('[data-bandgo]').forEach(function (el) {
      el.addEventListener('click', function () {
        var b = BANDS[+el.getAttribute('data-bandgo')];
        state.priceBand = [b.min, b.max === Infinity ? Number.MAX_VALUE : b.max];
        state.brand = 'all'; state.body = 'all'; state.bodyGroup = null;
        goto('inventory');
      });
    });
    var fb = document.getElementById('pk-f-body');
    if (fb) fb.addEventListener('change', function () { state.body = fb.value; state.bodyGroup = null; render(); });
    var ff = document.getElementById('pk-f-fuel');
    if (ff) ff.addEventListener('change', function () { state.fuel = ff.value; render(); });
    var fs = document.getElementById('pk-f-sort');
    if (fs) fs.addEventListener('change', function () { state.sort = fs.value; render(); });
    var rs = document.getElementById('pk-reset');
    if (rs) rs.addEventListener('click', function () { state.brand = 'all'; state.body = 'all'; state.fuel = 'all'; state.sort = 'new'; state.bodyGroup = null; state.priceBand = null; state.q = ''; state.favOnly = false; render(); });

    var gal = document.getElementById('pk-gal');
    if (gal) {
      gal.addEventListener('click', function (e) {
        if (e.target.closest('button') || gal._skipClick) return;
        state.lb = true; renderLb();
      });
      var tx0 = null;
      gal.addEventListener('touchstart', function (e) { tx0 = e.touches[0].clientX; }, { passive: true });
      gal.addEventListener('touchend', function (e) {
        if (tx0 == null) return;
        var dx = e.changedTouches[0].clientX - tx0;
        tx0 = null;
        if (Math.abs(dx) > 42) stepImg(dx < 0 ? 1 : -1);
      }, { passive: true });
      document.getElementById('pk-prev').addEventListener('click', function (e) { e.stopPropagation(); stepImg(-1); });
      document.getElementById('pk-next').addEventListener('click', function (e) { e.stopPropagation(); stepImg(1); });
      document.querySelectorAll('#pk-thumbs .thumb').forEach(function (th) {
        th.addEventListener('click', function () {
          var to = +th.getAttribute('data-gi');
          var dir = to >= state.gi ? 1 : -1;
          state.gi = to;
          updateGallery(carById(state.route.carId), dir);
        });
      });
      var strip = document.getElementById('pk-thumbs');
      strip.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { strip.scrollLeft += e.deltaY; e.preventDefault(); }
      }, { passive: false });
      // desktop drag to flip photos (kill native img drag first)
      gal.addEventListener('dragstart', function (e) { e.preventDefault(); });
      var drag = null;
      gal.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'touch' || e.target.closest('button')) return;
        drag = { x: e.clientX, moved: false };
      });
      gal.addEventListener('pointermove', function (e) {
        if (drag && Math.abs(e.clientX - drag.x) > 8) { drag.moved = true; gal.classList.add('dragging'); }
      });
      window.addEventListener('pointerup', function (e) {
        if (!drag) return;
        var dx = e.clientX - drag.x, moved = drag.moved;
        drag = null;
        gal.classList.remove('dragging');
        if (moved && Math.abs(dx) > 48) { stepImg(dx < 0 ? 1 : -1); gal._skipClick = true; setTimeout(function () { gal._skipClick = false; }, 60); }
      });
    }

    if (gal) preloadNeighbors(carById(state.route.carId));

    var rd = document.getElementById('pk-r-down'), rt = document.getElementById('pk-r-term');
    if (rd && rt) {
      var recalc = function () {
        var c = carById(state.route.carId);
        state.calcDown = +rd.value; state.calcTerm = +rt.value;
        document.getElementById('pk-down-pct').textContent = state.calcDown;
        document.getElementById('pk-down-eur').textContent = fmtEur(Math.round(c.price * state.calcDown / 100));
        document.getElementById('pk-term').textContent = state.calcTerm;
        document.getElementById('pk-calc-mo').textContent = fmtNum(monthly(c.price, state.calcDown, state.calcTerm));
      };
      rd.addEventListener('input', recalc);
      rt.addEventListener('input', recalc);
    }
  }

  function bindNav(el) {
    el.addEventListener('click', function (e) {
      var kind = el.getAttribute('data-nav');
      if (kind === 'home') { e.preventDefault(); goto('home'); }
      else if (kind === 'inventory') { e.preventDefault(); goto('inventory'); }
      else if (kind === 'services') { e.preventDefault(); scrollHome('servicii'); }
      else if (kind === 'showroom') { e.preventDefault(); scrollHome('showroom'); }
      else if (kind === 'contact') {
        e.preventDefault();
        // element-relative scroll survives the layout shift from the
        // content-visibility sections above collapsing as they render
        var c = state.route.page === 'home' ? document.querySelector('.closing') : null;
        if (c) {
          c.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // on short viewports the page bottoms out before the banner can
          // center, tucking the subtitle under the header — nudge it back down
          var clear = function () {
            var sub = c.querySelector('.closing-i');
            if (!sub) return;
            var over = 96 - sub.getBoundingClientRect().top;
            if (over > 0) window.scrollBy({ top: -over, behavior: 'smooth' });
          };
          if ('onscrollend' in window) window.addEventListener('scrollend', clear, { once: true });
          else setTimeout(clear, 700);
        }
        else { var f = document.getElementById('contact'); if (f) f.scrollIntoView({ behavior: 'smooth' }); }
      }
    });
  }

  /* ---------- navigation ---------- */
  var invScrollY = 0;
  function goto(page, carId) {
    if (state.route.page === 'inventory' && page === 'car') invScrollY = window.scrollY;
    var restore = state.route.page === 'car' && page === 'inventory';
    state.route = { page: page, carId: carId || null };
    state.gi = 0; state.lb = false;
    var h = page === 'home' ? '/' : page === 'inventory' ? '/automobile' : '/auto/' + carId;
    if (location.pathname !== h) history.pushState({}, '', h);
    if (page === 'inventory' && !restore) {
      render({ loading: true }, true);
      clearTimeout(skelTimer);
      skelTimer = setTimeout(function () { render(); window.scrollTo(0, 0); }, 450);
      window.scrollTo(0, 0);
    } else if (restore) {
      render(null, true);
      window.scrollTo(0, invScrollY);
    } else {
      render(null, true);
      window.scrollTo(0, 0);
    }
  }
  function scrollHome(anchor) {
    var go = function () {
      var el = document.getElementById(anchor);
      if (el) { var y = el.getBoundingClientRect().top + window.scrollY - 80; window.scrollTo({ top: y, behavior: 'smooth' }); }
    };
    if (state.route.page !== 'home') { goto('home'); setTimeout(go, 140); } else go();
  }
  function onRoute() {
    /* legacy #/ links keep working: migrate them to clean paths */
    var hm = location.hash.match(/^#\/(auto\/(.+)|automobile)\/?$/);
    if (hm) {
      var clean = hm[2] ? '/auto/' + hm[2] : '/automobile';
      history.replaceState({}, '', clean);
    }
    var m = location.pathname.match(/^\/auto\/([^\/]+)\/?$/);
    if (m) goto('car', decodeURIComponent(m[1]));
    else if (/^\/automobile\/?$/.test(location.pathname)) goto('inventory');
    else goto('home');
  }

  /* ---------- header / langs ---------- */
  function syncHeader() {
    document.querySelectorAll('.langs button').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-lang') === state.lang);
    });
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n'));
    });
    document.documentElement.lang = state.lang;
    var nav = { home: null, inventory: 'inventory' }[state.route.page];
    document.querySelectorAll('.hdr-nav a').forEach(function (a) {
      a.classList.toggle('on', a.getAttribute('data-nav') === nav);
    });
  }

  /* ---------- fx ---------- */
  function initTicks() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('[data-tick]').forEach(function (el) {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      var target = parseFloat(el.dataset.tick), dec = +(el.dataset.dec || 0);
      if (reduce || !('IntersectionObserver' in window)) { el.textContent = target.toFixed(dec); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.disconnect();
          var t0 = performance.now(), dur = 1100;
          var step = function (ts) {
            var p = Math.min(1, (ts - t0) / dur), e2 = 1 - Math.pow(1 - p, 3);
            el.textContent = (target * e2).toFixed(dec);
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      }, { threshold: 0.4 });
      io.observe(el);
    });
  }

  function onScroll() {
    var h = document.getElementById('pk-header');
    if (h) h.classList.toggle('on', window.scrollY > 40);

  }

  /* ---------- data layer (Supabase PostgREST) ---------- */
  function sbHeaders() { return { apikey: SB.anon, Authorization: 'Bearer ' + SB.anon }; }
  function fetchInventory() {
    return Promise.all([
      fetch(SB.url + '/rest/v1/cars?select=data,position&order=position.asc', { headers: sbHeaders() })
        .then(function (r) { if (!r.ok) throw new Error('cars ' + r.status); return r.json(); }),
      fetch(SB.url + '/rest/v1/settings?key=eq.featured&select=value', { headers: sbHeaders() })
        .then(function (r) { return r.ok ? r.json() : []; })
    ]).then(function (res) {
      return {
        cars: res[0].map(function (row) { return row.data; }),
        featured: (res[1][0] && res[1][0].value) || []
      };
    });
  }

  /* ---------- boot ---------- */
  document.querySelectorAll('.langs button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.lang = b.getAttribute('data-lang');
      try { localStorage.setItem('pk-lang', state.lang); } catch (e) {}
      render();
    });
  });
  document.querySelectorAll('.hdr [data-nav], footer [data-nav]').forEach(bindNav);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('popstate', onRoute);
  window.addEventListener('keydown', function (e) {
    if (state.route.page !== 'car') return;
    if (e.key === 'Escape' && state.lb) closeLb();
    if (e.key === 'ArrowRight') stepImg(1);
    if (e.key === 'ArrowLeft') stepImg(-1);
  });

  try { var saved = localStorage.getItem('pk-lang'); if (saved && T[saved]) state.lang = saved; } catch (e) {}

  /* preloader: shown on first visit or while waiting for first data */
  var preAt = Date.now();
  function showPre() {
    var pre = document.getElementById('pk-pre');
    if (pre.hidden) { pre.hidden = false; pre.classList.remove('out'); preAt = Date.now(); }
  }
  function hidePre() {
    var pre = document.getElementById('pk-pre');
    if (pre.hidden) return;
    var wait = Math.max(0, 900 - (Date.now() - preAt));
    setTimeout(function () {
      pre.classList.add('out');
      try { sessionStorage.setItem('pk-intro', '1'); } catch (e) {}
      setTimeout(function () { pre.hidden = true; }, 500);
    }, wait);
  }

  var booted = false;
  function boot(inv) {
    initData(inv);
    if (!booted) { booted = true; onRoute(); } else { render(); }
    onScroll();
  }

  var cached = null;
  try { cached = JSON.parse(localStorage.getItem('pk-inv-cache') || 'null'); } catch (e) {}
  var introSeen = false;
  try { introSeen = !!sessionStorage.getItem('pk-intro'); } catch (e) {}

  if (cached && cached.cars && cached.cars.length) {
    if (!introSeen) showPre();
    boot(cached);
    if (!introSeen) hidePre();
  } else {
    showPre();
  }

  fetchInventory().then(function (inv) {
    var raw = JSON.stringify(inv);
    try { localStorage.setItem('pk-inv-cache', raw); } catch (e) {}
    if (!booted) { boot(inv); hidePre(); }
    else if (raw !== JSON.stringify(cached)) { initData(inv); render(); }
  }).catch(function () {
    if (!booted) {
      if (cached && cached.cars) { boot(cached); }
      else {
        document.getElementById('pk-view').innerHTML =
          '<div style="padding:38vh 6vw;text-align:center;color:rgba(244,241,236,.55);font-size:15px">Stocul nu a putut fi încărcat. Verifică conexiunea și reîncearcă.</div>';
      }
      hidePre();
    }
  });

  /* ---------- pointer polish: hero parallax + magnetic CTAs (desktop only) ---------- */
  if (window.matchMedia('(pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var parX = 0, parY = 0, parTX = 0, parTY = 0, parRaf = null;
    var magEl = null;
    var parTick = function () {
      parRaf = null;
      parX += (parTX - parX) * .07;
      parY += (parTY - parY) * .07;
      var slide = state.route.page === 'home' ? document.querySelector('.hero-slide.on') : null;
      if (slide) slide.style.transform = 'translate3d(' + (parX * 14).toFixed(2) + 'px,' + (parY * 10).toFixed(2) + 'px,0)';
      if (Math.abs(parTX - parX) > .002 || Math.abs(parTY - parY) > .002) parRaf = requestAnimationFrame(parTick);
    };
    document.addEventListener('mousemove', function (e) {
      if (state.route.page === 'home') {
        var hero = document.querySelector('.hero');
        if (hero) {
          var r = hero.getBoundingClientRect();
          if (e.clientY >= r.top && e.clientY <= r.bottom) {
            parTX = (e.clientX / window.innerWidth - .5) * 2;
            parTY = ((e.clientY - r.top) / r.height - .5) * 2;
            if (!parRaf) parRaf = requestAnimationFrame(parTick);
          }
        }
      }
      var m = e.target.closest ? e.target.closest('.btn-red, .btn-ghost, .feat-nav button') : null;
      if (m !== magEl) { if (magEl) magEl.style.transform = ''; magEl = m; }
      if (magEl) {
        var b = magEl.getBoundingClientRect();
        magEl.style.transform = 'translate(' +
          ((e.clientX - b.left - b.width / 2) * .16).toFixed(2) + 'px,' +
          ((e.clientY - b.top - b.height / 2) * .22).toFixed(2) + 'px)';
      }
    }, { passive: true });
  }
})();
