async function loadData() {
  const res = await fetch('prayer-times-complete.json');
  const data = await res.json();

  function md(date) {
    return String(date.getMonth() + 1).padStart(2, '0') + '-' +
           String(date.getDate()).padStart(2, '0');
  }

  // Source timetable has no AM/PM:
  // Fajr/Sunrise = AM; Dhuhr/Asr/Maghrib/Isha = PM.
  function timeToMinutes(time, prayerName) {
    let [hours, minutes] = time.split(':').map(Number);
    if (['Asr', 'Maghrib', 'Isha'].includes(prayerName)) hours += 12;
    return hours * 60 + minutes;
  }

  function minutesToDisplay(totalMinutes) {
    totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    const hours24 = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const suffix = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  function displayAdhan(time, prayerName) {
    return minutesToDisplay(timeToMinutes(time, prayerName));
  }

  function salahMinutes(time, prayerName) {
    const delay = { Fajr: 25, Dhuhr: 20, Asr: 20, Maghrib: 10, Isha: 20 }[prayerName];
    if (delay === undefined) return null;
    return timeToMinutes(time, prayerName) + delay;
  }

  function getRowForDate(date) {
    const today = md(date);
    return data.find(row => today >= row.start && today <= row.end);
  }

  function buildPrayers(row) {
    return [
      { name: 'Fajr', adhan: row.fajr },
      { name: 'Sunrise', adhan: row.sunrise },
      { name: 'Dhuhr', adhan: row.dhuhr },
      { name: 'Asr', adhan: row.asr },
      { name: 'Maghrib', adhan: row.maghrib },
      { name: 'Isha', adhan: row.isha }
    ].map(p => ({
      ...p,
      adhanMinutes: timeToMinutes(p.adhan, p.name),
      salah: salahMinutes(p.adhan, p.name)
    }));
  }

  function getUpcoming(now, prayerList) {
    const current = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    let upcoming = prayerList.find(p => p.adhanMinutes > current);

    if (upcoming) {
      const target = new Date(now);
      target.setHours(Math.floor(upcoming.adhanMinutes / 60), upcoming.adhanMinutes % 60, 0, 0);
      return { prayer: upcoming, target };
    }

    // After Isha, the next prayer is tomorrow's Fajr.
    upcoming = prayerList[0];
    const target = new Date(now);
    target.setDate(target.getDate() + 1);
    target.setHours(Math.floor(upcoming.adhanMinutes / 60), upcoming.adhanMinutes % 60, 0, 0);
    return { prayer: upcoming, target };
  }

  function countdownText(ms) {
    if (ms < 0) ms = 0;
    const total = Math.floor(ms / 1000);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;

    if (days > 0) {
      return `${days}d ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
    }
    return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
  }

  function hijriDate(date) {
    try {
      return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return new Intl.DateTimeFormat('en-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    }
  }

  function render() {
    const now = new Date();
    const row = getRowForDate(now);
    if (!row) return;

    const prayers = buildPrayers(row);
    const prayerList = prayers.filter(p =>
      ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(p.name)
    );
    const upcomingInfo = getUpcoming(now, prayerList);
    const upcoming = upcomingInfo.prayer;

    document.getElementById('times').innerHTML = `
      <thead>
        <tr><th>Prayer</th><th>ADHAN</th><th>SALAH TIME</th></tr>
      </thead>
      <tbody>
        ${prayers.map(p => `
          <tr class="${p.name === upcoming.name ? 'upcoming' : ''}">
            <td>${p.name}</td>
            <td>${displayAdhan(p.adhan, p.name)}</td>
            <td>${p.salah === null ? '—' : minutesToDisplay(p.salah)}</td>
          </tr>
        `).join('')}
      </tbody>
    `;

    document.getElementById('headerAdhan').textContent = upcoming.name;
    document.getElementById('headerAdhanTime').textContent =
      displayAdhan(upcoming.adhan, upcoming.name);
    document.getElementById('headerSalahTime').textContent =
      minutesToDisplay(upcoming.salah);

    document.getElementById('nextPrayer').innerHTML =
      `<strong>Next Prayer: ${upcoming.name}</strong><br>${displayAdhan(upcoming.adhan, upcoming.name)}`;

    document.getElementById('countdown').textContent =
      countdownText(upcomingInfo.target.getTime() - now.getTime());

    document.getElementById('hijriDate').textContent = hijriDate(now);
  }

  function updateCountdown() {
    const now = new Date();
    const row = getRowForDate(now);
    if (!row) return;
    const prayers = buildPrayers(row);
    const prayerList = prayers.filter(p =>
      ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(p.name)
    );
    const upcomingInfo = getUpcoming(now, prayerList);
    document.getElementById('countdown').textContent =
      countdownText(upcomingInfo.target.getTime() - now.getTime());
  }

  render();
  setInterval(render, 30000);
  setInterval(updateCountdown, 1000);
}

function tick() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  document.getElementById('date').textContent =
    now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

setInterval(tick, 1000);
tick();
loadData();
