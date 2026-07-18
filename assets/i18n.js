/* Avrrora — language (UK/EN) and theme (light/dark) switching.
   Loaded synchronously in <head> on every public page:
   - the dark class lands on <html> before first paint (no flash);
   - a MutationObserver translates everything the page renders later
     (services cards, FAQ, gallery, booking calendar, status messages).
   The admin panel stays Ukrainian on purpose. */
(function () {
  'use strict';
  var THEME_KEY = 'avr-theme';
  var LANG_KEY = 'avr-lang';
  var theme = 'light';
  var lang = 'uk';
  try {
    theme = localStorage.getItem(THEME_KEY) || 'light';
    lang = localStorage.getItem(LANG_KEY) || 'uk';
  } catch (e) {}

  // ---------- theme ----------
  // Root-level invert flips the light design to dark; media re-inverts so
  // photos, video and the map stay natural. The filter-on-root exemption in
  // the CSS spec keeps position:fixed elements working.
  var css = document.createElement('style');
  css.textContent =
    'html.avr-dark{filter:invert(1) hue-rotate(180deg);background:#101018;color-scheme:dark;}' +
    'html.avr-dark img,html.avr-dark video,html.avr-dark iframe{filter:invert(1) hue-rotate(180deg);}' +
    '.avr-toggle{border:1px solid rgba(11,11,22,0.15);background:transparent;color:#3c3c50;border-radius:100px;padding:6px 11px;font-family:Manrope,sans-serif;font-size:13px;font-weight:700;cursor:pointer;line-height:1;}' +
    '.avr-toggle:hover{border-color:#7a3ff2;color:#7a3ff2;}';
  document.head.appendChild(css);
  if (theme === 'dark') document.documentElement.classList.add('avr-dark');

  // ---------- dictionary ----------
  var DICT = {
    // nav + footer + shared
    'Головна': 'Home', 'Про нас': 'About us', 'Роботи': 'Works', 'Послуги': 'Services',
    'Контакти': 'Contacts', 'На головну': 'Back home',
    'Салон краси у Києві. Вул. Січових Стрільців, 77 · щодня 9:00–20:00':
      'Beauty salon in Kyiv. 77 Sichovykh Striltsiv St · daily 9:00–20:00',
    '© 2026 Avrrora. Усі права захищено.': '© 2026 Avrrora. All rights reserved.',
    'Подзвонити': 'Call us',
    // home hero
    'Салон краси · Київ': 'Beauty salon · Kyiv',
    'Волосся, колір і макіяж — з увагою до деталей. Ми створюємо образи, які виглядають природно сьогодні та бездоганно завтра.':
      'Hair, colour and makeup — with attention to detail. We create looks that feel natural today and flawless tomorrow.',
    'Записатися на консультацію': 'Book a consultation',
    'Послуги та ціни': 'Services & prices',
    'Наші роботи': 'Our works',
    // marquee
    'Блонд': 'Blonde', 'Балаяж': 'Balayage', 'Стрижки': 'Haircuts', 'Кератин': 'Keratin',
    'Укладки': 'Styling', 'Вечірні зачіски': 'Evening updos', 'Макіяж': 'Makeup',
    'Весільні образи': 'Bridal looks',
    // home sections
    'Команда майстрів, для яких краса — це ремесло, а не шаблон.':
      'A team of artists for whom beauty is a craft, not a template.',
    'Ми спеціалізуємось на складному фарбуванні, доглядових процедурах і макіяжі. Кожен візит починається з консультації — щоб результат пасував саме вам.':
      'We specialise in complex colouring, treatments and makeup. Every visit starts with a consultation — so the result suits you.',
    'Дізнатися більше про команду →': 'Meet the team →',
    'Фарбування': 'Colouring',
    'Блонд, балаяж, AirTouch — від 1 200 грн': 'Blonde, balayage, AirTouch — from 1 200 UAH',
    'Стрижки та догляд': 'Haircuts & care',
    'Стрижки, кератин, ботокс — від 650 грн': 'Cuts, keratin, botox — from 650 UAH',
    'Макіяж і зачіски': 'Makeup & updos',
    'Денний, вечірній, весільний — від 550 грн': 'Day, evening, bridal — from 550 UAH',
    'Останні роботи': 'Latest works', 'Уся галерея →': 'Full gallery →',
    'Як усе відбувається': 'How it works',
    'Ваш візит — крок за кроком': 'Your visit, step by step',
    'Запис': 'Booking',
    'Телефонуйте або пишіть у Direct — підберемо зручний час і майстра під вашу задачу.':
      "Call us or message us on Instagram — we'll find a convenient time and the right artist.",
    'Консультація': 'Consultation',
    'Діагностика волосся, обговорення референсів і чесна відповідь, що реально за один візит.':
      "Hair diagnostics, reference discussion and an honest answer about what's possible in one visit.",
    'Процедура': 'Procedure',
    'Кава, плед і улюблений серіал — а ми тим часом працюємо. Ціну ви знаєте ще до початку.':
      'Coffee, a blanket and your favourite show — while we work. You know the price before we start.',
    'Догляд вдома': 'Home care',
    'Розповімо, як підтримати результат: які засоби потрібні саме вам, а на чому можна заощадити.':
      "We'll explain how to maintain the result: which products you actually need, and where you can save.",
    'Подарунок': 'Gift', 'Подарункові сертифікати': 'Gift certificates',
    'На конкретну послугу або суму — гарний конверт додаємо. Діє 6 місяців.':
      'For a specific service or amount — nice envelope included. Valid 6 months.',
    '1 000 грн': '1 000 UAH', '2 000 грн': '2 000 UAH', '3 000 грн': '3 000 UAH', '5 000 грн': '5 000 UAH',
    'Акції': 'Offers', 'Приємні бонуси': 'Nice bonuses',
    '«Щаслива година» — будні до 12:00': '“Happy hour” — weekdays before 12:00',
    'Перший візит до салону': 'First visit to the salon',
    'Приведіть подругу — знижка обом': 'Bring a friend — discount for both',
    'Відгуки': 'Reviews', 'Нам довіряють свій образ': 'People trust us with their look',
    '«Робила тотал блонд після невдалого фарбування в іншому місці. Майстриня чесно розповіла, що можливо за один візит, а що ні. Результат — ідеальний холодний блонд і живе волосся.»':
      '“I went total blonde after a failed colouring elsewhere. The colourist honestly explained what was possible in one visit and what was not. The result — perfect cold blonde and healthy hair.”',
    'Марина К. · фарбування': 'Maryna K. · colouring',
    '«Весільний макіяж і зачіска. Протрималось із 7 ранку до останнього танцю. Дуже спокійна атмосфера, ніякого поспіху — і фото вийшли неймовірні.»':
      '“Bridal makeup and hair. It lasted from 7 am until the last dance. Very calm atmosphere, no rush — and the photos came out incredible.”',
    'Олена Т. · весільний образ': 'Olena T. · bridal look',
    '«Ходжу на стрижку та кератин уже другий рік. Подобається, що не нав\'язують зайвого і завжди пояснюють догляд удома. Волосся ніколи не виглядало краще.»':
      '“I\'ve been coming for cuts and keratin for two years. I love that they never upsell and always explain home care. My hair has never looked better.”',
    'Ірина Д. · догляд за волоссям': 'Iryna D. · hair care',
    // about
    'Avrrora — це вісім майстрів і одне переконання: краса має бути вашою.':
      'Avrrora is eight artists and one belief: beauty should be yours.',
    'Ми відкрилися у 2019 році як невелика студія фарбування — і виросли в повноцінний салон, куди приходять за кольором, стрижками, доглядом і образами на найважливіші дні.':
      'We opened in 2019 as a small colour studio — and grew into a full salon people visit for colour, cuts, care and looks for their biggest days.',
    'років досвіду': 'years of experience', 'майстрів у команді': 'artists on the team',
    'задоволених клієнток': 'happy clients', 'середня оцінка відгуків': 'average review score',
    'Команда': 'Team', 'Наші майстри': 'Our artists',
    'Засновниця · колорист': 'Founder · colourist',
    '12 років у професії. Спеціалізація — складний блонд і тотальні трансформації кольору.':
      '12 years in the craft. Specialises in complex blonde and total colour transformations.',
    'Топ-стиліст': 'Top stylist',
    'Стрижки, які тримають форму між візитами, та укладки на щодень. 8 років досвіду.':
      'Haircuts that hold their shape between visits, and everyday styling. 8 years of experience.',
    'Візажист · брови': 'Makeup artist · brows',
    'Весільні та вечірні образи, які живуть до ранку. Понад 200 наречених за плечима.':
      'Bridal and evening looks that last till morning. Over 200 brides and counting.',
    'Зачіски · укладки': 'Updos · styling',
    'Від низьких пучків до голлівудської хвилі. Працює швидко — образ за 40–60 хвилин.':
      'From low buns to Hollywood waves. Works fast — a full look in 40–60 minutes.',
    'Наші принципи': 'Our principles',
    'Спершу — консультація': 'Consultation first',
    'Перед будь-якою процедурою обговорюємо стан волосся, очікування та реальний результат. Без обіцянок, які шкодять.':
      'Before any procedure we discuss hair condition, expectations and the realistic result. No harmful promises.',
    'Здоров\'я волосся понад усе': 'Hair health above all',
    'Працюємо на професійних лініях і не беремося за трансформації, які зруйнують волосся за один візит.':
      "We use professional product lines and never take on transformations that would destroy hair in one visit.",
    'Чесні ціни': 'Honest prices',
    'Вартість озвучуємо до початку роботи — після діагностики довжини та густоти. Жодних сюрпризів у кінці.':
      'We quote the price before we start — after assessing length and density. No surprises at the end.',
    'Подивитися наші роботи': 'See our works',
    // works
    'Портфоліо': 'Portfolio',
    'Реальні клієнтки, реальне світло салону — без фільтрів. Натисніть на фото, щоб роздивитися ближче.':
      'Real clients, real salon light — no filters. Tap a photo to take a closer look.',
    'До / після': 'Before / after', 'До': 'Before', 'Після': 'After',
    'Трансформація за один візит': 'A one-visit transformation',
    'Потягніть повзунок, щоб порівняти. Тут — відновлення пошкодженого волосся й перехід у теплий блонд-балаяж: знебарвлення, тонування та догляд, що повернув волоссю блиск і живу довжину.':
      'Drag the slider to compare. Here — damaged hair restored and taken to a warm blonde balayage: lightening, toning and care that brought back shine and healthy length.',
    'Балаяж + догляд · від 3 500 грн': 'Balayage + care · from 3 500 UAH',
    'Усі': 'All', 'Блонд і колір': 'Blonde & colour', 'Зачіски': 'Updos',
    'Сподобалось? Подивіться, скільки це коштує.': 'Liked it? See what it costs.',
    'Голлівудські локони': 'Hollywood waves', 'Стрижка шарами + контуринг': 'Layered cut + contouring',
    'Вечірній макіяж': 'Evening makeup', 'Блонд з локонами': 'Blonde with waves',
    'Карамельний блонд': 'Caramel blonde', 'Пружні кучері': 'Bouncy curls',
    'Зачіска · низький пучок': 'Updo · low bun', 'Оформлення брів': 'Brow shaping',
    'Бежевий блонд': 'Beige blonde', 'Весільний образ': 'Bridal look',
    'Попелястий блонд': 'Ash blonde', 'Вечірня зачіска': 'Evening updo',
    'Кератинове випрямлення': 'Keratin straightening', 'Перлинний блонд': 'Pearl blonde',
    'Холодний балаяж': 'Cold balayage', 'Стрижка + укладка': 'Cut + styling',
    // services
    'Що ми робимо': 'What we do',
    'Ціни вказано «від» — точну вартість майстер озвучує після діагностики довжини та густоти волосся, до початку роботи.':
      'Prices are “from” — the exact cost is quoted after assessing hair length and density, before we start.',
    'Жіноча стрижка + укладка': "Women's cut + styling",
    'Стрижка гарячими ножицями': 'Hot scissors cut',
    'Підрівнювання кінчиків': 'Trim',
    'Дитяча стрижка (до 10 років)': "Kids' cut (under 10)",
    'Фарбування в один тон': 'Single-tone colouring', 'Тотал блонд': 'Total blonde',
    'Балаяж / AirTouch': 'Balayage / AirTouch', 'Тонування': 'Toning',
    'Догляд за волоссям': 'Hair care', 'Ботокс для волосся': 'Hair botox',
    'SPA-відновлення': 'SPA repair', 'Укладки та зачіски': 'Styling & updos',
    'Укладка брашингом': 'Blowout styling', 'Локони / голлівудська хвиля': 'Waves / Hollywood wave',
    'Весільна зачіска (з репетицією)': 'Bridal updo (with trial)',
    'Денний макіяж': 'Day makeup',
    'Весільний макіяж (з репетицією)': 'Bridal makeup (with trial)',
    'Калькулятор': 'Calculator',
    'Порахуйте орієнтовну вартість': 'Estimate the cost',
    'Послуга': 'Service', 'Довжина волосся': 'Hair length', 'Орієнтовно': 'Estimate',
    'Точну ціну майстер назве після діагностики — до початку роботи.':
      'The exact price is quoted after diagnostics — before we start.',
    'Кератин / ботокс': 'Keratin / botox',
    'Коротке (до плечей)': 'Short (to shoulders)', 'Середнє (до лопаток)': 'Medium (to shoulder blades)',
    'Довге (нижче лопаток)': 'Long (below shoulder blades)',
    'Не знаєте, що обрати?': 'Not sure what to choose?',
    'Напишіть нам в Instagram — підкажемо і підберемо майстра.':
      "Message us on Instagram — we'll help you choose and match you with an artist.",
    // faq
    'Питання та відповіді': 'Questions & answers',
    'Найчастіші питання перед візитом. Не знайшли своє — телефонуйте або пишіть у Direct.':
      "The most common questions before a visit. Can't find yours — call us or message us on Instagram.",
    'Скільки триває тотал блонд?': 'How long does total blonde take?',
    'Від 4 до 8 годин залежно від вихідного кольору та стану волосся. Якщо волосся було пофарбоване в темний, іноді потрібно 2 візити — чесно скажемо це на консультації.':
      "4 to 8 hours depending on your starting colour and hair condition. If your hair was dyed dark, it sometimes takes 2 visits — we'll tell you honestly at the consultation.",
    'Як підготуватися до кератину?': 'How do I prepare for keratin?',
    'Ніяк особливо — просто прийдіть з немитим 1–2 дні волоссям або помиємо в салоні. Головне: не плануйте після процедури спортзал чи басейн на найближчі 3 дні.':
      "Nothing special — come with hair unwashed for 1–2 days, or we'll wash it here. Just don't plan gym or pool for 3 days after the procedure.",
    'Чи можна прийти з дитиною?': 'Can I bring my child?',
    'Так, у нас є зона очікування з диваном. А дітей до 10 років стрижемо самі — від 350 грн.':
      'Yes, we have a waiting area with a sofa. And we cut kids under 10 ourselves — from 350 UAH.',
    'Чи потрібна передоплата?': 'Do I need a deposit?',
    'Для звичайних послуг — ні. Для весільних образів і виїздів беремо передоплату 30%, вона фіксує дату за вами.':
      'Not for regular services. For bridal looks and on-location work we take a 30% deposit that locks in your date.',
    'Що як мені не сподобається результат?': "What if I don't like the result?",
    'Скажіть одразу — корекцію протягом 7 днів робимо безкоштовно. Нам важливо, щоб ви повернулися, а не просто пішли.':
      "Tell us right away — corrections within 7 days are free. We want you to come back, not just walk away.",
    'Ви працюєте з чоловіками?': 'Do you work with men?',
    'Так — стрижки, догляд і фарбування. Ціни ті самі, дивіться розділ «Послуги».':
      'Yes — cuts, care and colouring. Same prices, see the Services page.',
    'За скільки записуватися?': 'How far ahead should I book?',
    'На будні зазвичай є вікна день у день. На суботу та вечірні години краще за 3–5 днів, на весільні дати — за місяць.':
      'Weekdays usually have same-day openings. For Saturdays and evenings book 3–5 days ahead; for wedding dates — a month.',
    'Які засоби ви використовуєте?': 'What products do you use?',
    'Професійні лінії для фарбування та догляду. Конкретні марки підбираємо під стан волосся — на консультації покажемо і пояснимо чому саме це.':
      "Professional colour and care lines. We match specific brands to your hair condition — at the consultation we'll show you and explain why.",
    'Щоб результат жив довше': 'To make the result last longer',
    'Після блонду': 'After blonde',
    'Безсульфатний шампунь, відтіночна маска раз на тиждень і термозахист перед укладкою. Перші 48 годин — без миття.':
      'Sulfate-free shampoo, a toning mask once a week and heat protection before styling. No washing for the first 48 hours.',
    'Після кератину': 'After keratin',
    '72 години без хвостиків, шпильок і миття. Далі — шампунь без сульфатів і мінімум солоної води: море «з\'їдає» кератин.':
      "72 hours without ponytails, pins or washing. Then sulfate-free shampoo and minimal salt water: the sea 'eats' keratin.",
    'Щоденний догляд': 'Daily care',
    'Незмивний кондиціонер на кінчики, гребінець з рідкими зубцями на вологе волосся та підрівнювання раз на 2–3 місяці.':
      'Leave-in conditioner on the ends, a wide-tooth comb for wet hair and a trim every 2–3 months.',
    // contacts
    'Де нас знайти': 'Where to find us',
    'Київ, вул. Січових Стрільців, 77 — 2-й поверх, вхід з двору. Працюємо щодня з 9:00 до 20:00.':
      '77 Sichovykh Striltsiv St, Kyiv — 2nd floor, courtyard entrance. Open daily 9:00–20:00.',
    'Метро': 'Metro',
    'Станція «Лук\'янівська» — 7 хвилин пішки. Вихід у бік вул. Січових Стрільців, далі прямо повз сквер до будинку 77.':
      'Lukianivska station — a 7-minute walk. Exit towards Sichovykh Striltsiv St, then straight past the square to building 77.',
    'Маршрутка': 'Bus',
    '№ 477 від ст. м. «Вокзальна» — до зупинки «Січових Стрільців». Від зупинки до входу — 2 хвилини, орієнтир: арка з двору.':
      'Route 477 from Vokzalna metro — to the Sichovykh Striltsiv stop. 2 minutes from the stop to the entrance; look for the courtyard arch.',
    'Авто': 'By car',
    'Безкоштовний паркінг у дворі будинку — заїзд через арку з вул. Січових Стрільців. Увечері місця є майже завжди.':
      'Free parking in the courtyard — enter through the arch from Sichovykh Striltsiv St. Evenings almost always have space.',
    'Запис — за дзвінком або в Instagram': 'Book by phone or on Instagram',
    'Щодня 9:00–20:00 · відповідаємо у Direct протягом години': 'Daily 9:00–20:00 · we reply on Instagram within an hour',
    'Запишіться на консультацію онлайн': 'Book a consultation online',
    'Оберіть день': 'Pick a day', 'Оберіть час': 'Pick a time', 'Ваші контакти': 'Your contacts',
    'Записатися': 'Book', 'Записуємо…': 'Booking…',
    'Завантажуємо вільний час…': 'Loading available times…',
    'На цей день вільних місць немає — оберіть інший.': 'No free slots on this day — please pick another.',
    'Не вдалося завантажити вільний час — спробуйте пізніше або зателефонуйте.':
      "Couldn't load available times — try again later or give us a call.",
    'Оберіть, будь ласка, день і час візиту.': 'Please pick a day and time for your visit.',
    'Немає зв\'язку з сервером — зателефонуйте нам, будь ласка.': 'No connection to the server — please call us.',
    'Щось пішло не так — зателефонуйте нам, будь ласка.': 'Something went wrong — please call us.',
    'Цей час щойно зайняли — оберіть, будь ласка, інший.': 'That time was just taken — please pick another.',
    'Онлайн-запис тимчасово недоступний — зателефонуйте нам, будь ласка.': 'Online booking is temporarily unavailable — please call us.',
    'Не вдалося зберегти запис — зателефонуйте нам, будь ласка.': "Couldn't save the booking — please call us.",
    'Запис можливий лише на найближчі 14 днів': 'Booking is only available for the next 14 days',
    'Онлайн-запис працює у будні (пн–пт)': 'Online booking works on weekdays (Mon–Fri)',
    'Вкажіть ім\'я та коректний номер телефону': 'Please enter your name and a valid phone number',
    'Оберіть дату та час візиту': 'Please pick a date and time',
    'База даних недоступна': 'Database unavailable', 'База даних не налаштована': 'Database is not configured',
    "Ваше ім'я": 'Your name', 'Телефон': 'Phone',
    "Послуга (не обов'язково)": 'Service (optional)',
    // 404
    'Схоже, ця сторінка пішла на фарбування': 'Looks like this page left for a colouring session',
    'І повернеться нескоро. А от ви можете повернутися на головну — там усе на місці.':
      "It won't be back soon. But you can go back to the homepage — everything's in place there.",
    // titles
    'Avrrora — салон краси у Києві': 'Avrrora — beauty salon in Kyiv',
    'Про нас — Avrrora': 'About us — Avrrora',
    'Роботи — Avrrora': 'Works — Avrrora',
    'Послуги та ціни — Avrrora': 'Services & prices — Avrrora',
    'FAQ — Avrrora': 'FAQ — Avrrora',
    'Контакти — Avrrora': 'Contacts — Avrrora',
    'Сторінку не знайдено — Avrrora': 'Page not found — Avrrora',
    // misc
    'Інтер\'єр салону Avrrora': 'Avrrora salon interior',
    'Карта — салон Avrrora': 'Map — Avrrora salon'
  };

  // Short tokens inside composed strings (booking calendar day cards).
  var TOKENS = {
    'січ': 'Jan', 'лют': 'Feb', 'бер': 'Mar', 'кві': 'Apr', 'тра': 'May', 'чер': 'Jun',
    'лип': 'Jul', 'сер': 'Aug', 'вер': 'Sep', 'жов': 'Oct', 'лис': 'Nov', 'гру': 'Dec',
    'ПН': 'Mo', 'ВТ': 'Tu', 'СР': 'We', 'ЧТ': 'Th', 'ПТ': 'Fr', 'СБ': 'Sa', 'НД': 'Su'
  };

  // Patterns with interpolated values.
  var REGEX = [
    [/^Готово! Чекаємо на вас (.+) о (\d{1,2}:\d{2})\. Якщо плани зміняться — просто зателефонуйте\.$/,
      "Done! See you on $1 at $2. If your plans change, just give us a call."],
    [/^від ([\d\s ]+) грн$/, 'from $1 UAH'],
    [/^Запис можливий лише на найближчі (\d+) днів$/, 'Booking is only available for the next $1 days']
  ];

  function trString(t) {
    if (!t) return null;
    if (DICT[t]) return DICT[t];
    for (var i = 0; i < REGEX.length; i++) {
      if (REGEX[i][0].test(t)) return t.replace(REGEX[i][0], REGEX[i][1]);
    }
    var out = t.replace(/[А-ЯІЇЄҐа-яіїєґ']+/g, function (w) { return TOKENS[w] || w; });
    return out !== t ? out : null;
  }

  function trTextNode(node) {
    var raw = node.nodeValue;
    var t = raw.trim();
    var v = trString(t);
    if (v !== null) node.nodeValue = raw.replace(t, v);
  }

  var ATTRS = ['placeholder', 'title', 'alt', 'aria-label'];
  function trElementAttrs(el) {
    ATTRS.forEach(function (a) {
      var v = el.getAttribute && el.getAttribute(a);
      if (v) {
        var t = trString(v.trim());
        if (t !== null) el.setAttribute(a, t);
      }
    });
  }

  function translateTree(root) {
    if (root.nodeType === 3) { trTextNode(root); return; }
    if (root.nodeType !== 1) return;
    trElementAttrs(root);
    var els = root.querySelectorAll('[placeholder],[title],[alt],[aria-label]');
    for (var i = 0; i < els.length; i++) trElementAttrs(els[i]);
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = walker.nextNode())) trTextNode(n);
  }

  if (lang === 'en') {
    document.documentElement.setAttribute('lang', 'en');
    // Translate everything the page renders, whenever it renders.
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        for (var i = 0; i < m.addedNodes.length; i++) translateTree(m.addedNodes[i]);
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', function () {
      translateTree(document.body);
      var t = trString(document.title);
      if (t !== null) document.title = t;
    });
  }

  // ---------- toggles in the nav ----------
  function addToggles() {
    var nav = document.querySelector('nav');
    if (!nav || document.getElementById('avr-lang-toggle')) return;
    var wrap = document.createElement('span');
    wrap.setAttribute('style', 'display:flex;gap:6px;align-items:center;');

    var langBtn = document.createElement('button');
    langBtn.id = 'avr-lang-toggle';
    langBtn.type = 'button';
    langBtn.className = 'avr-toggle';
    langBtn.textContent = lang === 'en' ? 'УКР' : 'EN';
    langBtn.title = lang === 'en' ? 'Переключити мову' : 'Switch language';
    langBtn.addEventListener('click', function () {
      try { localStorage.setItem(LANG_KEY, lang === 'en' ? 'uk' : 'en'); } catch (e) {}
      location.reload();
    });

    var themeBtn = document.createElement('button');
    themeBtn.id = 'avr-theme-toggle';
    themeBtn.type = 'button';
    themeBtn.className = 'avr-toggle';
    themeBtn.textContent = '◐';
    themeBtn.title = lang === 'en' ? 'Switch theme' : 'Переключити тему';
    themeBtn.addEventListener('click', function () {
      var dark = document.documentElement.classList.toggle('avr-dark');
      try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) {}
    });

    wrap.appendChild(langBtn);
    wrap.appendChild(themeBtn);
    nav.insertBefore(wrap, nav.querySelector('.avr-burger')); // burger stays rightmost on phones
  }
  if (document.readyState !== 'loading') addToggles();
  else document.addEventListener('DOMContentLoaded', addToggles);
})();
