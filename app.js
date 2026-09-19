(function () {
  'use strict';

  let timetable = [];

  function pad(n) { return String(n).padStart(2, '0'); }

  function dateKey(d) {
    return pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseTime(value, prayer) {
    if (!value || typeof value !== 'string') return NaN;
    const parts = value.trim().split(':').map(Number);
    if (parts.length !== 2 || parts.some(Number.isNaN)) return NaN;

    let h = parts[0], m = parts[1];

    // The source timetable uses 24-hour-looking values without AM/PM.
    // Fajr/Sunrise are AM; Dhuhr is already 12:xx; Asr/Maghrib/Isha
    // are written as 03:xx/06:xx/07:xx and therefore need +12 hours.
    if (['Asr', 'Maghrib', 'Isha'].includes(prayer)) h += 12;

    return h * 60 + m;
  }

  function displayTime(totalMinutes) {
    totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    const h24 = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const suffix = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 || 12;
    return pad(h12) + ':' + pad(m) + ' ' + suffix;
  }

  function getRow(date) {
    const key = dateKey(date);
    return timetable.find(row => key >= row.start && key <= row.end) || null;
  }

  function makePrayers(row) {
    const source = [
      ['Fajr', row.fajr, 25],
      ['Sunrise', row.sunrise, null],
      ['Dhuhr', row.dhuhr, 20],
      ['Asr', row.asr, 20],
      ['Maghrib', row.maghrib, 10],
      ['Isha', row.isha, 20]
    ];

    return source.map(([name, value, delay]) => {
      const adhan = parseTime(value, name);
      return {
        name,
        raw: value,
        adhan,
        salah: Number.isFinite(adhan) && delay !== null ? adhan + delay : null
      };
    });
  }

  const HIJRI_MONTHS = [
    'Muharram',
    'Safar',
    "Rabi' al-Awwal",
    "Rabi' al-Aahir",
    'Jumad al-Awwal',
    'Jumad al-Aahir',
    'Rajab',
    "Sha'ban",
    'Ramadan',
    'Shawwal',
    "Dhul-Qi'dah",
    'Dhul-Hijjah'
  ];

  function hijriFallback(date) {
    const jd = Math.floor(date.getTime() / 86400000) + 2440588;
    let l = jd - 1948440 + 10632;
    let n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    let j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719)
          + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
    l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
          - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
    const month = Math.floor((24 * l) / 709);
    const day = l - Math.floor((709 * month) / 24);
    const year = 30 * n + j - 30;
    return day + ' ' + HIJRI_MONTHS[month - 1] + ' ' + year;
  }

  function getHijri(date) {
    const locales = [
      'en-u-ca-islamic-umalqura',
      'en-u-ca-islamic'
    ];

    for (const locale of locales) {
      try {
        const formatter = new Intl.DateTimeFormat(locale, {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric'
        });
        const parts = formatter.formatToParts(date);
        const day = Number((parts.find(p => p.type === 'day') || {}).value);
        const month = Number((parts.find(p => p.type === 'month') || {}).value);
        const year = Number((parts.find(p => p.type === 'year') || {}).value);

        if (
          Number.isFinite(day) &&
          Number.isFinite(month) &&
          Number.isFinite(year) &&
          month >= 1 && month <= 12
        ) {
          return day + ' ' + HIJRI_MONTHS[month - 1] + ' ' + year;
        }
      } catch (e) {}
    }

    return hijriFallback(date);
  }

  function upcomingPrayer(now, prayers) {
    const current = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const prayerOnly = prayers.filter(p => ['Fajr','Dhuhr','Asr','Maghrib','Isha'].includes(p.name));

    let next = prayerOnly.find(p => p.adhan > current);
    let targetDate = new Date(now);

    if (!next) {
      next = prayerOnly[0];
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const target = new Date(targetDate);
    target.setHours(Math.floor(next.adhan / 60), next.adhan % 60, 0, 0);

    return { prayer: next, adhanTarget: target };
  }

  function countdown(ms) {
    if (!Number.isFinite(ms)) return '—';
    ms = Math.max(0, ms);
    const total = Math.floor(ms / 1000);
    const days = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (days > 0) return days + 'd ' + pad(h) + ':' + pad(m) + ':' + pad(s);
    return pad(h) + ':' + pad(m) + ':' + pad(s);
  }

  function render(now) {
    const row = getRow(now);
    if (!row) {
      document.getElementById('hijriDate').textContent = getHijri(now);
      document.getElementById('countdown').textContent = 'Prayer data unavailable';
      return;
    }

    const prayers = makePrayers(row);
    const upcoming = upcomingPrayer(now, prayers);
    const next = upcoming.prayer;

    const tbody = document.querySelector('#times tbody');
    tbody.innerHTML = prayers.map(p => {
      const salah = p.salah === null ? '—' : displayTime(p.salah);
      return '<tr class="' + (p.name === next.name ? 'upcoming' : '') + '">' +
             '<td>' + p.name + '</td>' +
             '<td>' + (Number.isFinite(p.adhan) ? displayTime(p.adhan) : '—') + '</td>' +
             '<td>' + salah + '</td>' +
             '</tr>';
    }).join('');

    document.getElementById('headerAdhan').textContent = next.name;
    document.getElementById('headerAdhanTime').textContent = displayTime(next.adhan);
    document.getElementById('headerSalahTime').textContent = displayTime(next.salah);
    document.getElementById('hijriDate').textContent = getHijri(now);

    document.getElementById('nextPrayer').innerHTML =
      '<strong>Next Prayer: ' + next.name + '</strong> · Adhan ' +
      displayTime(next.adhan) + ' · Salah ' + displayTime(next.salah);

    document.getElementById('countdown').textContent =
      countdown(upcoming.adhanTarget.getTime() - now.getTime());
  }

  function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent =
      now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    document.getElementById('date').textContent =
      now.toLocaleDateString([], {weekday:'short', year:'numeric', month:'short', day:'numeric'});
    if (timetable.length) render(now);
  }

  async function start() {
    try {
      const response = await fetch('./prayer-times-complete.json', {cache: 'no-store'});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      timetable = await response.json();
      render(new Date());
    } catch (error) {
      console.error('Prayer data error:', error);
      document.getElementById('hijriDate').textContent = getHijri(new Date());
      document.getElementById('countdown').textContent = 'Unable to load prayer data';
    }
  }

  updateClock();
  setInterval(updateClock, 1000);
  start();
})();