const Stock = require('../models/Stock');
const fetch = require('node-fetch');

const partApiUrl = 'https://repeated-alpaca.glitch.me/v1/stock/';

function createFullApiUrl (stockName) {
  return partApiUrl + stockName + '/quote';
}

function makeApiCall(stockName, callback){
  let url = createFullApiUrl(stockName);
  fetch(url)
  .then(res => res.json())
  .then(data => callback(null, data))
  .catch(err => callback(err));
}

function addToDatabase(stock, stockLikeObj, callback){
  makeApiCall(stock, function(err, stockData){
    if(err){
      return callback(err);
    } else if (stockData === 'Unknown symbol') {
      const errObj = { message: stockData };
      return callback(errObj);
    }
    // Create stock document
    const stock_ticker = stockData.symbol;
    const stock_name = stockData.companyName;
    const price = stockData.latestPrice;
    const ip_likes = stockLikeObj.like ? [stockLikeObj.ip] : [];

    Stock.create({
      stock_ticker,
      stock_name,
      price,
      ip_likes
    }, function(err, doc){
       if(err){
        return callback(err);
      } else {
        // Successfully added to database
        callback(null, doc);
      }
    });
  });  
}

function updateDatabase(item, stockLikeObj, callback){
  makeApiCall(item.stock_ticker, function(err, stockData){
    if(err){
      return callback(err);
    }
    // Check to see if like has been ticked and that IP address has not already liked stock
    if(stockLikeObj.like && !item.ip_likes.includes(stockLikeObj.ip)){
      item.ip_likes.push(stockLikeObj.ip);
    }
    // Update price
    item.price = stockData.latestPrice;
    
    // Save updated item to database
    item.save(function(err, doc){
       if(err){
        return callback(err);
      } else {
        // Successfully added to database
        callback(null, doc)
      }
    });
  });    
}

function handleMultipleStocks(stocks, stockLikeObj, callback){  
  // Check to see if stock 1 is in database
  Stock.find({ stock_ticker: { $in: [stocks[0], stocks[1]] }}, function(err, item){
    // Returns Array
    if(err){
      return callback(err);
    } else if (!item.length) {
      // Both stocks need to be added to database
      addToDatabase(stocks[0], stockLikeObj, function(err, doc1){
        if(err) return callback(err);
        addToDatabase(stocks[1], stockLikeObj, function(err, doc2){
          if(err) return callback(err);
          callback(null, doc1, doc2);
        });
      });
    } else if (item.length === 2) {
      // Both stocks exist in database and need to be updated
      updateDatabase(item[0], stockLikeObj, function(err, doc1){
        if(err) return callback(err);
        updateDatabase(item[1], stockLikeObj, function(err, doc2){
          if(err) return callback(err);
          callback(null, doc1, doc2);
        });
      });
    } else {
      // One stock is in database, one stock needs to be added to database
      updateDatabase(item[0], stockLikeObj, function(err, doc1){
        if(err) return callback(err);
        // Check index of stock already in database and return opposite value
        const indexOfStockToAdd = stocks.indexOf(item[0].stock_ticker) ? 0 : 1;
        addToDatabase(stocks[indexOfStockToAdd], stockLikeObj, function(err, doc2){
          if(err) return callback(err);
          callback(null, doc1, doc2);
        });
      });
    }
  });
}

function handleSingleStock(stock, stockLikeObj, callback){
  // Check to see if stock is in database
  Stock.findOne({ stock_ticker: stock.toUpperCase() }, function(err, item){
    if(err){
      return callback(err);
    } else if (!item) {
      // Add to database
      addToDatabase(stock, stockLikeObj, function(err, doc){
        if(err) return callback(err);
        callback(null, doc);
      })
    } else {
      // Update database
      updateDatabase(item, stockLikeObj, function(err, doc){
        if(err) return callback(err);
        callback(null, doc);
      })
    }
  }); 
}

module.exports = function (req, res){
  const { stock } = req.query;
  const stockLikeObj = {
    like: req.query.like,
    ip: req.ip
  };
  // Check to see if multiple stocks have been entered
  if(Array.isArray(stock)){
    // Multiple Stocks
    const upperCaseStock = stock.map(element => {
      return element.toUpperCase();
    });
    handleMultipleStocks(upperCaseStock, stockLikeObj, function(err, doc1, doc2){
      if(err) return res.status(500).send(err.message);
      else {
        const stockData1 = {
          stock_ticker: doc1.stock_ticker,
          price: doc1.price,
          rel_likes: doc1.ip_likes.length - doc2.ip_likes.length
        };
        const stockData2 = {
          stock_ticker: doc2.stock_ticker,
          price: doc2.price,
          rel_likes: doc2.ip_likes.length - doc1.ip_likes.length
        };
        return res.json({ stockData: [stockData1, stockData2] });
      }
    })
  } else {
    // Single Stock
    handleSingleStock(stock, stockLikeObj, function(err, doc){
      if(err) {
        return res.status(500).send({ error: err.message });
      } else {
        const stockData = {
          stock_ticker: doc.stock_ticker,
          price: doc.price,
          likes: doc.ip_likes.length
        };
        return res.json({ stockData });
      }
    });  
  }
}
