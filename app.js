async function loadData() {
  const res = await fetch('prayer-times-complete.json');
  const data = await res.json();

  function md(date) {
    return String(date.getMonth() + 1).padStart(2, '0') + '-' +
           String(date.getDate()).padStart(2, '0');
  }

  // The timetable stores clock times without AM/PM.
  // These are the intended periods:
  // Fajr/Sunrise = AM; Dhuhr = PM; Asr/Maghrib/Isha = PM.
  function timeToMinutes(time, prayerName) {
    let [hours, minutes] = time.split(':').map(Number);

    if (['Asr', 'Maghrib', 'Isha'].includes(prayerName)) {
      hours += 12;
    }

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

  function calculateSalahTime(time, prayerName) {
    const delay = {
      Fajr: 25,
      Dhuhr: 20,
      Asr: 20,
      Maghrib: 10,
      Isha: 20
    }[prayerName];

    if (delay === undefined) return null;

    return timeToMinutes(time, prayerName) + delay;
  }

  function getTodayRow(date) {
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
    ].map(prayer => ({
      ...prayer,
      adhanMinutes: timeToMinutes(prayer.adhan, prayer.name),
      salahMinutes: calculateSalahTime(prayer.adhan, prayer.name)
    }));
  }

  function updatePrayerDisplay() {
    const now = new Date();
    const row = getTodayRow(now);
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
            <td>${displayAdhan(p.adhan, p.name)}</td>
            <td>${p.salahMinutes === null ? '—' : minutesToDisplay(p.salahMinutes)}</td>
          </tr>
        `).join('')}
      </tbody>
    `;

    // Only the five actual prayers participate in "upcoming prayer".
    const prayerList = prayers.filter(p =>
      ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(p.name)
    );

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // IMPORTANT: find the first prayer AFTER the current local time.
    let upcoming = prayerList.find(p => p.adhanMinutes > currentMinutes);

    // If it is after Isha, the next prayer is tomorrow's Fajr.
    if (!upcoming) {
      upcoming = prayerList[0];
    }

    // Highlight upcoming prayer.
    document.querySelectorAll('#times tbody tr').forEach(tr => {
      tr.classList.remove('upcoming');
      if (tr.children[0]?.textContent.trim() === upcoming.name) {
        tr.classList.add('upcoming');
      }
    });

    // Top cards ALWAYS show the upcoming prayer.
    document.getElementById('headerAdhan').textContent = upcoming.name;
    document.getElementById('headerAdhanTime').textContent =
      displayAdhan(upcoming.adhan, upcoming.name);

    document.getElementById('headerSalahTime').textContent =
      minutesToDisplay(upcoming.salahMinutes);

    document.getElementById('nextPrayer').innerHTML =
      `<strong>Next Prayer: ${upcoming.name}</strong><br>` +
      displayAdhan(upcoming.adhan, upcoming.name);
  }

  updatePrayerDisplay();

  // Refresh the prayer calculation every 30 seconds.
  setInterval(updatePrayerDisplay, 30000);
}

function tick() {
  const now = new Date();

  document.getElementById('clock').textContent =
    now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

  document.getElementById('date').textContent =
    now.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
}

setInterval(tick, 1000);
tick();
loadData();
