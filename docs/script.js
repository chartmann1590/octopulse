// OctoPulse site interactions
function toast(msg){
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> el.classList.remove('show'), 2800);
}
function toggleFaq(btn){
  const item = btn.closest('.faq-item');
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i=> i.classList.remove('open'));
  if(!wasOpen) item.classList.add('open');
}
function handleNotify(e){
  e.preventDefault();
  const inputs = ['notifyEmail','notifyEmail2'].map(id=> document.getElementById(id)).filter(Boolean);
  let email = '';
  // find which form submitted
  const form = e.target;
  const input = form.querySelector('input[type="email"]');
  email = input ? input.value.trim() : '';
  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    toast('Please enter a valid email.');
    return false;
  }
  // Use mailto as lightweight waitlist (no backend). Could integrate Formspree later.
  const subject = encodeURIComponent('Notify me — OctoPulse Play Store launch');
  const body = encodeURIComponent(`Please notify me when OctoPulse launches on Google Play.\n\nEmail: ${email}\n\nI understand this will be a single launch notification and my email won't be shared.\n`);
  // store locally to show we captured
  try{ localStorage.setItem('octopulse_waitlist_email', email); }catch{}
  toast(`Thanks! We'll notify ${email} at launch — email draft opened.`);
  // open mailto (user confirms)
  setTimeout(()=>{
    window.location.href = `mailto:hello@octopulse.app?subject=${subject}&body=${body}`;
  }, 600);
  // clear inputs
  inputs.forEach(i=> i.value = '');
  // also try to send to Formspree if configured? fallback no-op
  return false;
}
// smooth scroll for hash links with offset for sticky nav
document.addEventListener('click', (e)=>{
  const a = e.target.closest('a[href^="#"]');
  if(!a) return;
  const id = a.getAttribute('href');
  if(id.length <= 1) return;
  const target = document.querySelector(id);
  if(!target) return;
  e.preventDefault();
  const top = target.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({top, behavior:'smooth'});
  history.pushState(null,'',id);
});
// screenshots lightbox
const shotMeta = {
  '01-dashboard': { label: '01 — Dashboard • 2 printers, 1 printing', file: '01-dashboard.png' },
  '02-discover': { label: '02 — Discover • mDNS / SSDP / manual', file: '02-discover.png' },
  '03-pairing': { label: '03 — 1-Click Pairing • Waiting for approval', file: '03-pairing.png' },
  '04-detail': { label: '04 — Detail Overview • camera & job actions', file: '04-detail.png' },
  '05-control': { label: '05 — Control • jog, temps, fan', file: '05-control.png' },
  '06-gcode': { label: '06 — G-code • 2D & 3D toolpaths', file: '06-gcode.png' },
};
function openShot(id){
  const meta = shotMeta[id];
  if(!meta) return;
  const modal = document.getElementById('shotModal');
  const img = document.getElementById('shotModalImg');
  const label = document.getElementById('shotModalLabel');
  // use optimized 1080 webp for fast lightbox; PNG available as fallback/download
  const webp = `screenshots/${id}-1080.webp`;
  const png = `screenshots/${meta.file}`;
  img.src = webp;
  img.dataset.png = png;
  img.onerror = () => { /* keep webp */ };
  label.textContent = meta.label + '  •  tap image for PNG';
  img.onclick = () => { window.open(png, '_blank'); };
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeShot(){
  const modal = document.getElementById('shotModal');
  if(!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape') closeShot();
});
// close toast on click
document.addEventListener('DOMContentLoaded', ()=>{
  const t = document.getElementById('toast');
  if(t) t.addEventListener('click', ()=> t.classList.remove('show'));
  // restore email if any
  try{
    const saved = localStorage.getItem('octopulse_waitlist_email');
    if(saved){
      const i = document.getElementById('notifyEmail');
      if(i && !i.value) i.placeholder = saved + ' \u2713 saved \u2014 enter another?';
    }
  }catch{}
  // pause promo video when modal open? not needed
  // keyboard for shots: Enter on focused shot
  document.querySelectorAll('.shot').forEach(el=>{
    el.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  });
});
