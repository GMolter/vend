// admin.js

document.addEventListener('DOMContentLoaded', () => {
  const miniConsole = document.getElementById('miniConsole');
  function miniLog(msg) {
    const d = document.createElement('div');
    d.textContent = msg;
    miniConsole.appendChild(d);
    miniConsole.scrollTop = miniConsole.scrollHeight;
  }

  miniLog('🛠️ UI painted; scheduling data load…');

  // Firebase init
  const cfg = {
    apiKey: "AIzaSyB3rahMcbUqRAetLoEKwwTDKf89I2sn85Y",
    authDomain: "cyberflashvend.firebaseapp.com",
    databaseURL: "https://cyberflashvend-default-rtdb.firebaseio.com/",
    projectId: "cyberflashvend",
    storageBucket: "cyberflashvend.firebasestorage.app",
    messagingSenderId: "63786658773",
    appId: "1:63786658773:web:7792d3693ef45e9ec4eb5c"
  };
  firebase.initializeApp(cfg);
  const db = firebase.database();

  // global snack-slot map
  const SNACK_SLOTS = [
    { slot:"C2", name:"Chips"       },
    { slot:"E1", name:"Cookies"     },
    { slot:"E2", name:"Pretzels"    },
    { slot:"E3", name:"Candy Bar"   },
    { slot:"E4", name:"Granola Bar" },
    { slot:"E5", name:"Trail Mix"   }
  ];

  // schedule after paint
  function loadAll() {
    fetchRecent();
    fetchBrowse();
  }
  if ('requestIdleCallback' in window) requestIdleCallback(loadAll);
  else setTimeout(loadAll, 50);

  // ---- Recent 6 ----
  function fetchRecent() {
    db.ref('Logs')
      .orderByKey()
      .limitToLast(6)
      .once('value')
      .then(snap => {
        const rc = document.getElementById('recentContainer');
        rc.innerHTML = '';
        const rows = [];
        snap.forEach(daySnap => {
          const date = daySnap.key.replace(/-/g,'/');
          daySnap.forEach(logSnap => {
            const l = logSnap.val();
            const items = (''+l.Payload).split(',')
              .filter(x=>x)
              .map(i => SNACK_SLOTS[+i-1]?.name || `#${i}`);
            rows.push({
              date,
              time: l.Time.replace(/s.*$/,''),
              user: l.User,
              items
            });
          });
        });
        rows.reverse().forEach(e => {
          const div = document.createElement('div');
          div.className = 'recent-card';
          div.innerHTML = `
            <p class="time">${e.date} ${e.time}</p>
            <p>User: ${e.user}</p>
            <p>Items: ${e.items.join(', ')}</p>
          `;
          rc.appendChild(div);
        });
        if (rows.length > 6) {
          const mb = document.getElementById('moreBtn');
          mb.style.display = 'inline-block';
          mb.onclick = () => {
            document.getElementById('browseWrapper')
              .scrollIntoView({ behavior:'smooth' });
          };
        }
      })
      .catch(err => miniLog('❌ Recent load error: ' + err));
  }

  // ---- Browse last 30 days ----
  function fetchBrowse() {
    const DAYS = 30;
    db.ref('Logs')
      .orderByKey()
      .limitToLast(DAYS)
      .once('value')
      .then(snap => {
        const dc = document.getElementById('datesContainer');
        const uc = document.getElementById('usersContainer');
        dc.innerHTML = '';
        uc.innerHTML = '';
        const users = {}, keys = [];

        snap.forEach(daySnap => {
          keys.push(daySnap.key);
          daySnap.forEach(ls => users[ls.val().User] = true);
        });

        // dates
        keys.sort((a,b) => b.localeCompare(a)).forEach(dk => {
          const card = document.createElement('div');
          card.className = 'date-card';
          const disp = dk.replace(/-/g,'/');
          card.innerHTML = `<span>${disp}</span>`;
          card.onclick = () => openDateModal(dk);
          dc.appendChild(card);
        });

        // users
        Object.keys(users).sort().forEach(u => {
          const card = document.createElement('div');
          card.className = 'user-card';
          card.innerHTML = `<span>${u}</span>`;
          card.onclick = () => openUserModal(u);
          uc.appendChild(card);
        });

        // live search
        document.getElementById('searchInput')
          .addEventListener('input', e => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('.date-card').forEach(c => {
              c.style.display = c.textContent.toLowerCase().includes(q)?'':'none';
            });
            document.querySelectorAll('.user-card').forEach(c => {
              c.style.display = c.textContent.toLowerCase().includes(q)?'':'none';
            });
          });
      })
      .catch(err => miniLog('❌ Browse load error: ' + err));
  }

  // expose for modals
  window.openDateModal = (dateKey) => {
    const md = document.getElementById('dateModal'),
          bd = document.getElementById('dateModalBody'),
          tt = document.getElementById('dateModalTitle');
    tt.textContent = `Transactions on ${dateKey.replace(/-/g,'/')}`;
    bd.innerHTML = 'Loading…';
    document.getElementById('modalBackdrop').style.display = 'block';
    md.style.display = 'block';

    firebase.database().ref(`Logs/${dateKey}`)
      .once('value')
      .then(snap => {
        const html = Object.values(snap.val()||{}).map(l => {
          const items = (''+l.Payload).split(',')
            .filter(x=>x)
            .map(i => SNACK_SLOTS[+i-1]?.name || `#${i}`);
          return `
            <div class="txn-card">
              <p><strong>${l.Time.replace(/s.*$/,'')}</strong> — ${l.User}</p>
              <p>Items: ${items.join(', ')}</p>
            </div>`;
        }).join('');
        bd.innerHTML = html || '<p>No Transactions</p>';
      })
      .catch(e => { bd.innerHTML = '<p style="color:red;">Error</p>'; });
  };

  window.openUserModal = (user) => {
    const md = document.getElementById('userModal'),
          bd = document.getElementById('userModalBody'),
          tt = document.getElementById('userModalTitle');
    tt.textContent = `User “${user}”`;
    bd.innerHTML = 'Loading…';
    document.getElementById('modalBackdrop').style.display = 'block';
    md.style.display = 'block';

    // only last 30 days
    firebase.database().ref('Logs')
      .orderByKey()
      .limitToLast(30)
      .once('value')
      .then(snap => {
        const dates = new Set();
        snap.forEach(daySnap => {
          Object.values(daySnap.val()).forEach(l => {
            if (l.User === user) dates.add(daySnap.key);
          });
        });
        if (!dates.size) {
          bd.innerHTML = '<p>No Transactions</p>';
        } else {
          bd.innerHTML = Array.from(dates)
            .sort((a,b) => b.localeCompare(a))
            .map(dk => `
              <button class="btn" style="margin:4px;"
                onclick="openDateModal('${dk}')">
                ${dk.replace(/-/g,'/')}
              </button>
            `).join('');
        }
      })
      .catch(e => { bd.innerHTML = '<p style="color:red;">Error</p>'; });
  };
});

// simple modal-close
function closeModal(){
  document.getElementById('modalBackdrop').style.display = 'none';
  document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
}
