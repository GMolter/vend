// admin.js

// —————————————————————————————————————————
// 1) Mini-console hook is already inline in index.html.
// 2) This file executes immediately (script is at bottom of body).
// —————————————————————————————————————————

// Kick things off
console.log('🛠️ admin.js loaded; scheduling data load…');

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

// Snack-slot lookup for all modals
const SNACK_SLOTS = [
  { slot:"C2", name:"Chips"       },
  { slot:"E1", name:"Cookies"     },
  { slot:"E2", name:"Pretzels"    },
  { slot:"E3", name:"Candy Bar"   },
  { slot:"E4", name:"Granola Bar" },
  { slot:"E5", name:"Trail Mix"   }
];

// Hold lists for search
window._dates = [];
window._users = [];

// Fetch everything once browser is idle (or after 100ms)
function loadAll() {
  fetchRecent();
  fetchBrowse();
}
if (window.requestIdleCallback) {
  requestIdleCallback(loadAll);
} else {
  setTimeout(loadAll, 100);
}

// — Recent 6 Transactions —
function fetchRecent() {
  db.ref('Logs').orderByKey().limitToLast(6).once('value')
    .then(snap => {
      const rc = document.getElementById('recentContainer');
      rc.innerHTML = '';
      const rows = [];
      snap.forEach(daySnap => {
        const date = daySnap.key.replace(/-/g,'/');
        daySnap.forEach(ls => {
          const l = ls.val();
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
        const d = document.createElement('div');
        d.className = 'recent-card';
        d.innerHTML = `
          <p class="time">${e.date} ${e.time}</p>
          <p>User: ${e.user}</p>
          <p>Items: ${e.items.join(', ')}</p>
        `;
        rc.appendChild(d);
      });
      if (rows.length > 6) {
        const mb = document.getElementById('moreBtn');
        mb.style.display = 'inline-block';
        mb.onclick = () => document.getElementById('browseWrapper')
                                 .scrollIntoView({behavior:'smooth'});
      }
    })
    .catch(err => console.error('Recent load error:', err));
}

// — Browse last 30 days (dates + users) —
function fetchBrowse() {
  const DAYS = 30;
  db.ref('Logs').orderByKey().limitToLast(DAYS).once('value')
    .then(snap => {
      const dc = document.getElementById('datesContainer');
      const uc = document.getElementById('usersContainer');
      dc.innerHTML = '';
      uc.innerHTML = '';
      const users = {}, keys = [];

      snap.forEach(daySnap => {
        keys.push(daySnap.key);
        daySnap.forEach(ls => {
          users[ls.val().User] = true;
        });
      });

      // store for search
      window._dates = keys.slice();
      window._users = Object.keys(users).slice();

      // render date cards
      keys.sort((a,b) => b.localeCompare(a)).forEach(dk => {
        const card = document.createElement('div');
        card.className = 'date-card';
        const disp = dk.replace(/-/g,'/');
        card.innerHTML = `<span>${disp}</span>`;
        card.onclick = () => openDateModal(dk);
        dc.appendChild(card);
      });

      // render user cards
      window._users.sort().forEach(u => {
        const card = document.createElement('div');
        card.className = 'user-card';
        card.innerHTML = `<span>${u}</span>`;
        card.onclick = () => openUserModal(u);
        uc.appendChild(card);
      });
    })
    .catch(err => console.error('Browse load error:', err));
}

// — Search via Enter key (opens modal) —
document.getElementById('searchInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const q = e.target.value.trim();
    if (q) openSearchModal(q);
  }
});

// — Search Modal —
window.openSearchModal = function(q) {
  closeModal();
  const md = document.getElementById('searchModal'),
        bd = document.getElementById('searchModalBody'),
        tt = document.getElementById('searchModalTitle'),
        bp = document.getElementById('modalBackdrop');
  tt.textContent = `Search: "${q}"`;
  bd.innerHTML   = '<p>Searching…</p>';
  bp.style.display = 'block';
  md.style.display = 'block';

  const ql = q.toLowerCase();
  let html = '';

  // date matches
  const matchesD = window._dates.filter(dk => dk.replace(/-/g,'/').includes(ql));
  if (matchesD.length) {
    html += '<h4>Dates</h4>' + 
      matchesD.map(dk => `
        <button class="btn" style="margin:4px;"
          onclick="openDateModal('${dk}')">
          ${dk.replace(/-/g,'/')}
        </button>
      `).join('');
  }
  // user matches
  const matchesU = window._users.filter(u => u.toLowerCase().includes(ql));
  if (matchesU.length) {
    html += '<h4>Users</h4>' +
      matchesU.map(u => `
        <button class="btn" style="margin:4px;"
          onclick="openUserModal('${u}')">
          ${u}
        </button>
      `).join('');
  }
  if (!html) html = '<p>No matches found.</p>';
  bd.innerHTML = html;
};

// — Date Modal —
window.openDateModal = function(dk) {
  closeModal();
  const md = document.getElementById('dateModal'),
        bd = document.getElementById('dateModalBody'),
        tt = document.getElementById('dateModalTitle'),
        bp = document.getElementById('modalBackdrop');
  tt.textContent   = `Transactions on ${dk.replace(/-/g,'/')}`;
  bd.innerHTML     = 'Loading…';
  bp.style.display = 'block';
  md.style.display = 'block';

  firebase.database().ref(`Logs/${dk}`).once('value')
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
    .catch(e => {
      bd.innerHTML = '<p style="color:red;">Error loading</p>';
      console.error(e);
    });
};

// — User Modal —
window.openUserModal = function(user) {
  closeModal();
  const md = document.getElementById('userModal'),
        bd = document.getElementById('userModalBody'),
        tt = document.getElementById('userModalTitle'),
        bp = document.getElementById('modalBackdrop');
  tt.textContent   = `User “${user}”`;
  bd.innerHTML     = 'Loading…';
  bp.style.display = 'block';
  md.style.display = 'block';

  firebase.database().ref('Logs').orderByKey().limitToLast(30).once('value')
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
          .sort((a,b)=>b.localeCompare(a))
          .map(dk => `
            <button class="btn" style="margin:4px;"
              onclick="openDateModal('${dk}')">
              ${dk.replace(/-/g,'/')}
            </button>
          `).join('');
      }
    })
    .catch(e => {
      bd.innerHTML = '<p style="color:red;">Error loading</p>';
      console.error(e);
    });
};

// — Close any open modal —
function closeModal() {
  document.getElementById('modalBackdrop').style.display = 'none';
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}
