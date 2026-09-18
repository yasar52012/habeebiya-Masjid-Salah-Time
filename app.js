async function loadData() {
  const res = await fetch('prayer-times-complete.json');
  const data = await res.json();

  function md(d) {
    return String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  /*
   * The JSON stores times without AM/PM:
   * Fajr/Sunrise = AM
   * Dhuhr = PM (12:xx)
   * Asr = PM (03:xx)
   * Maghrib = PM (06:xx)
   * Isha = PM (07:xx)
   */
  function prayerToMinutes(time, name) {
    const [hours, minutes] = time.split(':').map(Number);
    let h = hours;

    if (name === 'Asr' || name === 'Maghrib' || name === 'Isha') {
      h += 12;
    }

    return h * 60 + minutes;
  }

  function addMinutes(time, name, minutesToAdd) {
    const total = prayerToMinutes(time, name) + minutesToAdd;
    const hours = Math.floor(total / 60) % 24;
    const minutes = total % 60;
    return String(hours).padStart(2, '0') + ':' +
           String(minutes).padStart(2, '0');
  }

  function formatTime(time, name) {
    let totalMinutes;

    // A calculated Salah time is already a 24-hour value.
    if (name === 'salah') {
      const [hours, minutes] = time.split(':').map(Number);
      totalMinutes = hours * 60 + minutes;
    } else {
      totalMinutes = prayerToMinutes(time, name);
    }

    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
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

    if (delays[name] === undefined) return null;
    return addMinutes(adhan, name, delays[name]);
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
      adhanMinutes: prayerToMinutes(adhan, name),
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
            <td>${formatTime(p.adhan, p.name)}</td>
            <td>${p.salah ? formatTime(p.salah, 'salah') : '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    `;

    // Sunrise is displayed in the table but is not treated as a prayer
    // for the upcoming-prayer banner.
    const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const prayerList = prayers.filter(p => prayerNames.includes(p.name));
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Find the first prayer later today.
    let upcomingPrayer = prayerList.find(p => p.adhanMinutes > nowMinutes);

    // If all today's prayers have passed, the next prayer is tomorrow's Fajr.
    // The timetable repeats daily, so the Fajr row from today is used for its time.
    if (!upcomingPrayer) {
      upcomingPrayer = prayerList[0];
    }

    // Highlight the upcoming prayer row.
    document.querySelectorAll('#times tbody tr').forEach(tr => {
      tr.classList.remove('upcoming');
      if (tr.firstElementChild &&
          tr.firstElementChild.textContent.trim() === upcomingPrayer.name) {
        tr.classList.add('upcoming');
      }
    });

    // TOP: always show the upcoming prayer, not the previously active prayer.
    document.getElementById('headerAdhan').textContent = upcomingPrayer.name;
    document.getElementById('headerAdhanTime').textContent =
      formatTime(upcomingPrayer.adhan, upcomingPrayer.name);
    document.getElementById('headerSalahTime').textContent =
      upcomingPrayer.salah ? formatTime(upcomingPrayer.salah, 'salah') : '—';

    document.getElementById('nextPrayer').innerHTML =
      `<strong>Next Prayer: ${upcomingPrayer.name}</strong><br>` +
      `${formatTime(upcomingPrayer.adhan, upcomingPrayer.name)}`;
  }

  updatePrayerDisplay();
  setInterval(updatePrayerDisplay, 30000);
}

function tick() {
  const n = new Date();
  document.getElementById('clock').innerText =
    n.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  document.getElementById('date').innerText =
    n.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
}

setInterval(tick, 1000);
tick();
loadData();
