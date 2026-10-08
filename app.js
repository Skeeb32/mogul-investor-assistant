const sidebar = document.querySelector('#sidebar');
const menuToggle = document.querySelector('#menu-toggle');
const toast = document.querySelector('#toast');
const dialog = document.querySelector('#invest-dialog');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

menuToggle?.addEventListener('click', () => {
  const open = sidebar.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});

document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    document.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
    const label = link.textContent.trim().replace(/^◫|^⌂|^▥|^↗|^▤|^⚙/, '').replace(/\d+$/, '').trim();
    document.querySelector('#crumb-current').textContent = label;
    sidebar.classList.remove('open');
    if (link.dataset.view === 'properties') document.querySelector('#property-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
    else if (link.dataset.view === 'activity') document.querySelector('.activity-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
    else if (link.dataset.view !== 'overview') showToast(`${label} is part of the full Mogul experience.`);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

document.querySelector('#explore-top').addEventListener('click', () => document.querySelector('#property-list').scrollIntoView({ behavior: 'smooth', block: 'start' }));
document.querySelector('#see-all').addEventListener('click', () => showToast('You’re viewing all currently open opportunities.'));
document.querySelector('#activity-link').addEventListener('click', () => showToast('You’re viewing your latest account activity.'));
document.querySelector('#learn-more').addEventListener('click', () => showToast('Mogul brings property details, reporting, and investor updates into one place.'));

document.querySelectorAll('.save-button').forEach((button) => {
  button.addEventListener('click', () => {
    const saved = button.classList.toggle('saved');
    button.textContent = saved ? '♥' : '♡';
    button.setAttribute('aria-pressed', String(saved));
    showToast(saved ? 'Property added to your saved list.' : 'Property removed from your saved list.');
  });
});

document.querySelectorAll('.invest-button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('#dialog-title').textContent = button.dataset.property;
    dialog.showModal();
  });
});

document.querySelector('#dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
document.querySelector('#dialog-action').addEventListener('click', () => {
  dialog.close();
  showToast('Offering details requested. This demo does not send personal information.');
});

document.querySelectorAll('.icon-button, .activity-item > button, .profile-button').forEach((button) => {
  button.addEventListener('click', () => showToast('You’re all caught up.'));
});
document.querySelector('#chart-period').addEventListener('click', () => showToast('Portfolio chart is showing the last 12 months.'));

document.querySelector('.property-card').setAttribute('data-market', 'New York');
document.querySelector('.property-card:nth-child(2)').setAttribute('data-market', 'Atlanta');
