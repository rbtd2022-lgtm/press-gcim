(function(){
  const frame = document.getElementById('siteFrame');
  const device = document.getElementById('device');
  const rotate = document.getElementById('rotate');
  const reload = document.getElementById('reload');
  const phone = document.getElementById('phone');
  const sizeLabel = document.getElementById('sizeLabel');

  let landscape = false;

  function loadSite(){
    frame.src = 'index.html';
  }

  function applySize(){
    let [w,h] = device.value.split('x').map(Number);
    if(landscape) [w,h] = [h,w];
    frame.style.width = w + 'px';
    frame.style.height = h + 'px';
    phone.style.width = (w + 48) + 'px';
    sizeLabel.textContent = w + ' × ' + h + ' px';
  }

  device.addEventListener('change', applySize);

  rotate.addEventListener('click', function(){
    landscape = !landscape;
    applySize();
  });

  reload.addEventListener('click', function(){
    loadSite();
  });

  applySize();
  loadSite();
})();
