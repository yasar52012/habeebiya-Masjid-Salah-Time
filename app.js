async function loadData() {
  const res = await fetch('prayer-times-complete.json');
  const data = await res.json();

  function md(d) {
    return String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  function toMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours % 12) * 60 + minutes;
  }

  function addMinutes(time, minutesToAdd) {
    const total = toMinutes(time) + minutesToAdd;
    const hours = Math.floor(total / 60) % 24;
    const minutes = total % 60;
    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
  }

  function formatTime(time) {
    const [hours, minutes] = time.split(':').map(Number);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  function salahTime(name, adhan) {
    const delays = {
      Fajr: 25,
      Dhuhr: 20,
      Asr: 20,
      Maghrib: 10,
      Isha: 20
    };

    return delays[name] === undefined ? null : addMinutes(adhan, delays[name]);
  }

  function getRowForDate(date) {
    const today = md(date);
    return data.find(x => today >= x.start && today <= x.end);
  }

  function buildPrayers(row) {
    return [
      ['Fajr', row.fajr],
      ['Sunrise', row.sunrise],
      ['Dhuhr', row.dhuhr],
      ['Asr', row.asr],
      ['Maghrib', row.maghrib],
      ['Isha', row.isha]
    ].map(([name, adhan]) => ({
      name,
      adhan,
      salah: salahTime(name, adhan)
    }));
  }

  function updatePrayerDisplay() {
    const now = new Date();
    const row = getRowForDate(now);
    if (!row) return;

    const prayers = buildPrayers(row);

    document.getElementById('times').innerHTML = `
      <thead>
        <tr>
          <th>Prayer</th>
          <th>ADHAN</th>
          <th>SALAH TIME</th>
        </tr>
      </thead>
      <tbody>
        ${prayers.map(p => `
          <tr>
            <td>${p.name}</td>
            <td>${formatTime(p.adhan)}</td>
            <td>${p.salah ? formatTime(p.salah) : '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    `;

    // Determine the currently active prayer from today's ADHAN times.
    const timedPrayers = prayers.filter(p => p.name !== 'Sunrise');
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let currentPrayer = null;
    let nextPrayer = null;

    for (let i = 0; i < timedPrayers.length; i++) {
      const current = timedPrayers[i];
      const currentMinutes = toMinutes(current.adhan);
      const next = timedPrayers[i + 1];
      const nextMinutes = next ? toMinutes(next.adhan) : Infinity;

      if (nowMinutes >= currentMinutes && nowMinutes < nextMinutes) {
        currentPrayer = current;
        nextPrayer = next || null;
        break;
      }
    }

    // After Isha or before Fajr, Isha remains the active prayer.
    if (!currentPrayer) {
      if (nowMinutes < toMinutes(timedPrayers[0].adhan)) {
        currentPrayer = timedPrayers[timedPrayers.length - 1];
        nextPrayer = timedPrayers[0];
      } else {
        currentPrayer = timedPrayers[timedPrayers.length - 1];
        nextPrayer = timedPrayers[0];
      }
    }

    document.getElementById('headerAdhan').textContent = currentPrayer.name;
    document.getElementById('headerAdhanTime').textContent = formatTime(currentPrayer.adhan);
    document.getElementById('headerSalahTime').textContent =
      currentPrayer.salah ? formatTime(currentPrayer.salah) : '—';

    if (nextPrayer) {
      document.getElementById('nextPrayer').innerHTML =
        `<strong>Next Prayer: ${nextPrayer.name}</strong><br>${formatTime(nextPrayer.adhan)}`;
    } else {
      document.getElementById('nextPrayer').textContent = 'Next Prayer: Fajr';
    }
  }

  updatePrayerDisplay();
  setInterval(updatePrayerDisplay, 30000);
}

function tick() {
  const n = new Date();
  document.getElementById('clock').innerText =
    n.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  document.getElementById('date').innerText =
    n.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

setInterval(tick, 1000);
tick();
loadData();
