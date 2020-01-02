const singleStockForm = document.getElementById('testForm');
const multipleStockForm = document.getElementById('testForm2');

singleStockForm.onsubmit = submitSingle;
multipleStockForm.onsubmit = submitMultiple;

const url = '/api/stock-prices?';

function submitSingle(e){
  e.preventDefault();
  let params = new URLSearchParams(new FormData(singleStockForm)).toString()
  const newUrl =  url + params;
  
  fetch(newUrl)
  .then(response => response.json())
  .then(data => {
    document.querySelector('#jsonResult').textContent = JSON.stringify(data);
  })
  .catch(err => {
    document.querySelector('#jsonResult').textContent = JSON.stringify(err.message);
  })
}

function submitMultiple(e){
  e.preventDefault();
  let params = new URLSearchParams(new FormData(multipleStockForm)).toString()
  const newUrl =  url + params;
  
  fetch(newUrl)
  .then(response => response.json())
  .then(data => {
    document.querySelector('#jsonResult').textContent = JSON.stringify(data);
  })
  .catch(err => {
    document.querySelector('#jsonResult').textContent = JSON.stringify(err.message);
  })
}