// Ember & Marrow — Premium Plan interactivity
// Performance notes: mouse/scroll handlers are throttled via requestAnimationFrame,
// listeners are passive where possible, and DOM reveals use IntersectionObserver
// instead of scroll polling, to keep the main thread free and interactions smooth.

document.addEventListener('DOMContentLoaded', () => {

  // Mobile nav
  const burger = document.querySelector('.burger');
  const navlinks = document.querySelector('.navlinks');
  if (burger && navlinks){
    burger.addEventListener('click', () => {
      navlinks.classList.toggle('open');
      burger.setAttribute('aria-expanded', navlinks.classList.contains('open'));
    });
  }

  // Active nav link
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navlinks a').forEach(a=>{
    if(a.getAttribute('href') === here) a.classList.add('active');
  });

  // Scroll reveal — IntersectionObserver (cheaper than scroll listeners)
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
    }, {threshold:.15});
    revealEls.forEach(el=>io.observe(el));
  }

  // ---- 3D medallion tilt (hero), throttled to animation frames ----
  const medallion = document.querySelector('.medallion');
  const stage = document.querySelector('.medallion-stage');
  if (medallion && stage && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    let ticking = false, mx = 0, my = 0;
    stage.addEventListener('mousemove', (e) => {
      const rect = stage.getBoundingClientRect();
      mx = ((e.clientX - rect.left) / rect.width - .5) * 26;
      my = ((e.clientY - rect.top) / rect.height - .5) * -26;
      if (!ticking){
        requestAnimationFrame(() => {
          medallion.style.transform = `rotateY(${mx}deg) rotateX(${my}deg)`;
          ticking = false;
        });
        ticking = true;
      }
    }, {passive:true});
    stage.addEventListener('mouseleave', () => {
      medallion.style.transform = 'rotateY(0deg) rotateX(0deg)';
    });
  }

  // ---- 3D tilt on menu cards ----
  const tiltCards = document.querySelectorAll('.tilt-wrap .menu-card');
  if (tiltCards.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    tiltCards.forEach(card => {
      let ticking = false, rx = 0, ry = 0;
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        ry = ((e.clientX - rect.left) / rect.width - .5) * 10;
        rx = ((e.clientY - rect.top) / rect.height - .5) * -10;
        if (!ticking){
          requestAnimationFrame(()=>{
            card.style.transform = `rotateY(${ry}deg) rotateX(${rx}deg) translateZ(6px)`;
            ticking = false;
          });
          ticking = true;
        }
      }, {passive:true});
      card.addEventListener('mouseleave', () => { card.style.transform = 'rotateY(0) rotateX(0)'; });
    });
  }

  // Menu filter tabs
  const filterBtns = document.querySelectorAll('.filter-btn');
  const menuCards = document.querySelectorAll('.menu-card');
  if (filterBtns.length){
    filterBtns.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        filterBtns.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.filter;
        menuCards.forEach(card=>{
          const match = cat === 'all' || card.dataset.cat === cat;
          card.classList.toggle('hide', !match);
          if (match) requestAnimationFrame(()=>card.classList.add('show'));
        });
      });
    });
  }

  // Testimonial carousel
  const track = document.querySelector('.carousel-track');
  if (track){
    const slides = track.children.length;
    let index = 0;
    const dotsWrap = document.querySelector('.carousel-controls');
    const dots = [];
    for(let i=0;i<slides;i++){
      const d = document.createElement('button');
      d.className = 'dot' + (i===0?' active':'');
      d.setAttribute('aria-label', 'Go to testimonial ' + (i+1));
      d.addEventListener('click', ()=>goTo(i));
      dotsWrap.appendChild(d);
      dots.push(d);
    }
    function goTo(i){
      index = (i + slides) % slides;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((d,di)=>d.classList.toggle('active', di===index));
    }
    document.querySelector('.arrow-prev')?.addEventListener('click', ()=>goTo(index-1));
    document.querySelector('.arrow-next')?.addEventListener('click', ()=>goTo(index+1));
    let auto = setInterval(()=>goTo(index+1), 6000);
    track.closest('.carousel').addEventListener('mouseenter', ()=>clearInterval(auto));
  }

  // FAQ accordion
  document.querySelectorAll('.acc-item').forEach(item=>{
    const q = item.querySelector('.acc-q');
    const a = item.querySelector('.acc-a');
    q.addEventListener('click', ()=>{
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.acc-item.open').forEach(o=>{
        if(o!==item){ o.classList.remove('open'); o.querySelector('.acc-a').style.maxHeight = null; }
      });
      item.classList.toggle('open', !isOpen);
      a.style.maxHeight = !isOpen ? a.scrollHeight + 'px' : null;
    });
  });

  // Contact form validation
  const form = document.getElementById('contact-form');
  if (form){
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;
      const name = form.querySelector('#name');
      const email = form.querySelector('#email');
      const message = form.querySelector('#message');
      [name, email, message].forEach(f => f.closest('.field').classList.remove('error'));

      if (!name.value.trim()){ name.closest('.field').classList.add('error'); valid = false; }
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      if (!emailOk){ email.closest('.field').classList.add('error'); valid = false; }
      if (!message.value.trim()){ message.closest('.field').classList.add('error'); valid = false; }

      const note = document.getElementById('submit-note');
      if (valid){
        note.textContent = "Thank you — your message has been sent. We'll reply within a day.";
        note.classList.add('show');
        form.reset();
      } else {
        note.textContent = "Please fill in the highlighted fields.";
        note.classList.add('show');
      }
    });
  }

  // ---- Reservation flow: multi-step with 3D flip transition ----
  const resCard = document.querySelector('.res-card');
  if (resCard){
    const steps = Array.from(resCard.querySelectorAll('.res-step'));
    const bits = Array.from(document.querySelectorAll('.res-progress .bit'));
    let current = 0;
    const state = { date:null, time:null, party:null, name:'', email:'', phone:'' };

    function updateProgress(){
      bits.forEach((b,i)=>{
        b.classList.toggle('done', i < current);
        b.classList.toggle('active', i === current);
      });
    }

    function goToStep(i){
      resCard.classList.add('flipping');
      setTimeout(()=>{
        steps[current].classList.remove('active');
        current = i;
        steps[current].classList.add('active');
        resCard.classList.remove('flipping');
        updateProgress();
        if (steps[current].dataset.step === 'review') fillSummary();
      }, 220);
    }

    function fillSummary(){
      document.getElementById('sum-date').textContent = state.date || '—';
      document.getElementById('sum-time').textContent = state.time || '—';
      document.getElementById('sum-party').textContent = state.party ? state.party + ' guests' : '—';
      document.getElementById('sum-name').textContent = state.name || '—';
    }

    // Party size pills
    resCard.querySelectorAll('[data-party]').forEach(p=>{
      p.addEventListener('click', ()=>{
        resCard.querySelectorAll('[data-party]').forEach(x=>x.classList.remove('selected'));
        p.classList.add('selected');
        state.party = p.dataset.party;
      });
    });
    // Time pills
    resCard.querySelectorAll('[data-time]').forEach(p=>{
      p.addEventListener('click', ()=>{
        resCard.querySelectorAll('[data-time]').forEach(x=>x.classList.remove('selected'));
        p.classList.add('selected');
        state.time = p.dataset.time;
      });
    });

    resCard.querySelector('#res-date')?.addEventListener('change', (e)=>{ state.date = e.target.value; });

    resCard.querySelectorAll('[data-next]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const stepEl = btn.closest('.res-step');
        if (stepEl.dataset.step === 'datetime' && (!state.date || !state.time || !state.party)){
          alert('Please choose a date, time, and party size.');
          return;
        }
        if (stepEl.dataset.step === 'details'){
          const nameEl = resCard.querySelector('#res-name');
          const emailEl = resCard.querySelector('#res-email');
          if (!nameEl.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())){
            alert('Please enter your name and a valid email.');
            return;
          }
          state.name = nameEl.value.trim();
          state.email = emailEl.value.trim();
          state.phone = resCard.querySelector('#res-phone').value.trim();
        }
        goToStep(current + 1);
      });
    });
    resCard.querySelectorAll('[data-back]').forEach(btn=>{
      btn.addEventListener('click', ()=> goToStep(current - 1));
    });
    resCard.querySelector('[data-confirm]')?.addEventListener('click', ()=>{
      goToStep(current + 1);
    });

    updateProgress();
  }
});
