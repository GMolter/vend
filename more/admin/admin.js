// --------------------------------------------------
// admin.js
// --------------------------------------------------

// 1) Prevent touch-scroll on mobile
document.addEventListener('touchmove', e => e.preventDefault(), { passive:false });

// 2) Hook console only to miniConsole (no recursion, no built-in logs)
(function(){
  const mc = document.getElementById("miniConsole");
  function logToMini(type, args){
    const d = document.createElement("div");
    d.textContent = `[${type}] ${Array.from(args).join(" ")}`;
    mc.appendChild(d);
    mc.scrollTop = mc.scrollHeight;
  }
  console.log   = function(){ logToMini("LOG",   arguments) };
  console.warn  = function(){ logToMini("WARN",  arguments) };
  console.error = function(){ logToMini("ERR",   arguments) };
})();

// 3) Global snack-slot map for modal functions
const SNACK_SLOTS = [
  { slot:"C2", name:"Chips"       },
  { slot:"E1", name:"Cookies"     },
  { slot:"E2", name:"Pretzels"    },
  { slot:"E3", name:"Candy Bar"   },
  { slot:"E4", name:"Granola Bar" },
  { slot:"E5", name:"Trail Mix"   }
];

// 4) After DOM paint, init Firebase + schedule our data fetch
document.addEventListener('DOMContentLoaded', ()=>{
  console.log("🛠️ UI painted, kicking off data load…");

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

  function loadAll(){
    fetchRecent();
    fetchBrowse();
  }

  // use idle callback so paint happens instantly
  if ('requestIdleCallback' in window) requestIdleCallback(loadAll);
  else setTimeout(loadAll, 50);

  // ---- Recent 6 transactions ----
  function fetchRecent(){
    db.ref('Logs')
      .orderByKey()
      .limitToLast(6)
      .once('value')
      .then(snap=>{
        const rc = document.getElementById('recentContainer');
        rc.innerHTML = "";
        const rows = [];
        snap.forEach(daySnap=>{
          const date = daySnap.key.replace(/-/g,'/');
          daySnap.forEach(ls=>{
            const l = ls.val();
            const items = (""+l.Payload).split(",")
              .filter(x=>x)
              .map(i=> SNACK_SLOTS[+i-1]?.name || `#${i}`);
            rows.push({ date, time:l.Time.replace(/s.*$/,''), user:l.User, items });
          });
        });
        rows.reverse().forEach(e=>{
          const d = document.createElement("div");
          d.className = "recent-card";
          d.innerHTML = `
            <p class="time">${e.date} ${e.time}</p>
            <p>User: ${e.user}</p>
            <p>Items: ${e.items.join(", ")}</p>
          `;
          rc.appendChild(d);
        });
        if(rows.length>6){
          const mb = document.getElementById('moreBtn');
          mb.style.display = 'inline-block';
          mb.onclick = ()=> document.getElementById('browseWrapper')
                               .scrollIntoView({behavior:'smooth'});
        }
      })
      .catch(err=>{
        console.error("Recent load error:", err);
      });
  }

  // ---- Browse last 30 days (dates + users) ----
  function fetchBrowse(){
    const DAYS = 30;
    db.ref('Logs')
      .orderByKey()
      .limitToLast(DAYS)
      .once('value')
      .then(snap=>{
        const dc = document.getElementById('datesContainer');
        const uc = document.getElementById('usersContainer');
        dc.innerHTML = ""; uc.innerHTML = "";
        const users = {};
        const keys  = [];
        snap.forEach(daySnap=>{
          keys.push(daySnap.key);
          daySnap.forEach(ls=>{
            users[ls.val().User] = true;
          });
        });

        // date cards
        keys.sort((a,b)=>b.localeCompare(a)).forEach(dk=>{
          const c = document.createElement("div");
          c.className = "date-card";
          const disp = dk.replace(/-/g,'/');
          c.innerHTML = `<span>${disp}</span>`;
          c.onclick = ()=> openDateModal(dk);
          dc.appendChild(c);
        });

        // user cards
        Object.keys(users).sort().forEach(u=>{
          const c = document.createElement("div");
          c.className = "user-card";
          c.innerHTML = `<span>${u}</span>`;
          c.onclick = ()=> openUserModal(u);
          uc.appendChild(c);
        });

        // live search
        document.getElementById('searchInput')
          .addEventListener('input', e=>{
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('.date-card').forEach(c=>{
              c.style.display = c.textContent.toLowerCase().includes(q)?'':'none';
            });
            document.querySelectorAll('.user-card').forEach(c=>{
              c.style.display = c.textContent.toLowerCase().includes(q)?'':'none';
            });
          });
      })
      .catch(err=>{
        console.error("Browse load error:", err);
      });
  }
});

// ---- Modal helpers (unchanged) ----
function closeModal(){
  document.getElementById('modalBackdrop').style.display = 'none';
  document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
}

function openDateModal(dateKey){
  const md = document.getElementById('dateModal'),
        bd = document.getElementById('dateModalBody'),
        tt = document.getElementById('dateModalTitle');
  tt.textContent = `Transactions on ${dateKey.replace(/-/g,'/')}`;
  bd.innerHTML = 'Loading…';
  document.getElementById('modalBackdrop').style.display='block';
  md.style.display='block';

  firebase.database().ref(`Logs/${dateKey}`)
    .once('value')
    .then(snap=>{
      const html = Object.values(snap.val()||{}).map(l=>{
        const items = (""+l.Payload).split(",")
                          .filter(x=>x)
                          .map(i=>SNACK_SLOTS[+i-1]?.name||`#${i}`);
        return `
          <div class="txn-card">
            <p><strong>${l.Time.replace(/s.*$/,"")}</strong> — ${l.User}</p>
            <p>Items: ${items.join(", ")}</p>
          </div>`;
      }).join("");
      bd.innerHTML = html || '<p>No Transactions</p>';
    })
    .catch(e=>{
      bd.innerHTML = '<p style="color:red;">Error loading</p>';
      console.error(e);
    });
}

function openUserModal(user){
  const md = document.getElementById('userModal'),
        bd = document.getElementById('userModalBody'),
        tt = document.getElementById('userModalTitle');
  tt.textContent = `User “${user}”`;
  bd.innerHTML = 'Loading…';
  document.getElementById('modalBackdrop').style.display='block';
  md.style.display='block';

  // check last 30 days for that user
  firebase.database().ref('Logs')
    .orderByKey()
    .limitToLast(30)
    .once('value')
    .then(snap=>{
      const dates = new Set();
      snap.forEach(daySnap=>{
        Object.values(daySnap.val()).forEach(l=>{
          if(l.User === user) dates.add(daySnap.key);
        });
      });
      if(!dates.size){
        bd.innerHTML = '<p>No Transactions</p>';
      } else {
        bd.innerHTML = Array.from(dates)
          .sort((a,b)=>b.localeCompare(a))
          .map(k=>`<button class="btn" style="margin:4px;"
                     onclick="openDateModal('${k}')">${k.replace(/-/g,'/')}</button>`)
          .join('');
      }
    })
    .catch(e=>{
      bd.innerHTML = '<p style="color:red;">Error loading</p>';
      console.error(e);
    });
}
