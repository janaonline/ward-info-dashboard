export function initBackButton(onBack) {
  document.getElementById('backFab').addEventListener('click', onBack);
}

export function setBackButtonVisible(visible) {
  document.getElementById('backFab').hidden = !visible;
}
