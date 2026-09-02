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
// close toast on click
document.addEventListener('DOMContentLoaded', ()=>{
  const t = document.getElementById('toast');
  if(t) t.addEventListener('click', ()=> t.classList.remove('show'));
  // restore email if any
  try{
    const saved = localStorage.getItem('octopulse_waitlist_email');
    if(saved){
      const i = document.getElementById('notifyEmail');
      if(i && !i.value) i.placeholder = saved + ' ✓ saved — enter another?';
    }
  }catch{}
});
